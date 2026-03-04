import { EventsHandler, IEventHandler, EventBus } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import * as cliProgress from 'cli-progress';
import { JobsScrapedEvent } from '@/modules/jobs/domain/events/jobs-scraped.event';
import { JobRepository } from '@/modules/jobs/domain/repositories/job.repository';
import { UserPreferenceRepository } from '../../domain/repositories/user-preference.repository';
import { KeywordFilterService } from '../../domain/services/keyword-filter.service';
import { LlmEvaluationService } from '../../domain/services/llm-evaluation.service';
import { JobEvaluatedEvent } from '@/modules/jobs/domain/events/job-evaluated.event';

/**
 * Event handler that subscribes to JobsScrapedEvent.
 * Evaluates each job using keyword filtering + LLM scoring.
 *
 * Per architecture rules (Events Rules, line 124):
 * "Event handlers only handle side effects (enqueue jobs, notify other modules).
 * They never modify the entity that originated the event."
 *
 * This handler is a side effect that enriches jobs with LLM scores.
 */
@EventsHandler(JobsScrapedEvent)
export class JobsScrapedEvaluationHandler implements IEventHandler<JobsScrapedEvent> {
  private readonly logger = new Logger(JobsScrapedEvaluationHandler.name);

  constructor(
    private readonly jobRepository: JobRepository,
    private readonly userPreferenceRepository: UserPreferenceRepository,
    private readonly keywordFilterService: KeywordFilterService,
    private readonly llmEvaluationService: LlmEvaluationService,
    private readonly eventBus: EventBus,
  ) {}

  async handle(event: JobsScrapedEvent): Promise<void> {
    // Fetch user preferences (for now, use default)
    const preferences = await this.userPreferenceRepository.findDefault();

    if (!preferences) {
      this.logger.warn('No user preferences found, skipping evaluation');
      return;
    }

    console.log('┌─────────────────────────────────────────────────────────┐');
    console.log('│          🤖 LLM EVALUATION STARTED                      │');
    console.log('└─────────────────────────────────────────────────────────┘');
    console.log(`📊 Jobs to evaluate: ${event.jobIds.length}`);
    console.log(`🧠 Model: ${preferences.llmModel}`);
    console.log(`🎯 Min score threshold: ${preferences.minScoreThreshold}\n`);

    // Create progress bar for LLM evaluation
    const evalProgressBar = new cliProgress.SingleBar({
      format:
        '🧠 Evaluating Jobs |{bar}| {percentage}% | {value}/{total} jobs | ETA: {eta}s | ⭐ Avg Score: {avgScore}',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true,
    });

    let evaluatedCount = 0;
    let filteredCount = 0;
    let errorCount = 0;
    let totalScore = 0;
    let processedCount = 0;

    evalProgressBar.start(event.jobIds.length, 0, { avgScore: 'N/A' });

    for (const jobId of event.jobIds) {
      try {
        const job = await this.jobRepository.findById(jobId);

        if (!job) {
          this.logger.warn(`Job ${jobId} not found, skipping`);
          continue;
        }

        // Skip if already evaluated (idempotency)
        if (job.score !== null && job.score !== undefined) {
          this.logger.debug(`Job ${jobId} already evaluated (score: ${job.score}), skipping`);
          continue;
        }

        // Step 1: Keyword filtering (pre-filter to reduce LLM costs)
        // COMMENTED OUT: Some jobs may mention other languages as "nice to have"
        // const filterResult = this.keywordFilterService.shouldFilter(
        //   job.jobDescription,
        //   preferences.excludedKeywords,
        // );

        // if (filterResult.filtered) {
        //   // Mark filtered job with score=0 and save reason to database
        //   const reasoning = `Filtered out by excluded keywords: ${filterResult.matchedKeywords.join(', ')}`;
        //   job.applyScore(0, reasoning, {});

        //   await this.jobRepository.save(job);

        //   this.logger.log(
        //     `Job ${jobId} filtered out (matched: ${filterResult.matchedKeywords.join(', ')})`,
        //   );
        //   filteredCount++;
        //   continue; // Skip LLM evaluation
        // }

        // Step 2: LLM evaluation (only for jobs that passed keyword filter)
        const evaluation = await this.llmEvaluationService.evaluateJob(
          job,
          preferences.systemPrompt,
          preferences.scoringCriteria,
          preferences.llmModel,
        );

        // Step 3: Update job with score using domain method
        job.applyScore(evaluation.score, evaluation.scoreReasoning, evaluation.scoreCriteria);

        await this.jobRepository.save(job);

        // Step 5: Publish JobEvaluatedEvent
        this.eventBus.publish(
          new JobEvaluatedEvent(
            job.id,
            evaluation.score,
            evaluation.scoreReasoning,
            evaluation.scoreCriteria,
          ),
        );

        evaluatedCount++;
        totalScore += evaluation.score;
        processedCount++;
        const avgScore = Math.round(totalScore / processedCount);
        evalProgressBar.update(processedCount, { avgScore: avgScore.toString() });
      } catch (error) {
        const errorStack = error instanceof Error ? error.stack : String(error);
        this.logger.error(
          `\n❌ Failed to evaluate job ${jobId}: ${error instanceof Error ? error.message : String(error)}`,
        );
        errorCount++;
        processedCount++;
        evalProgressBar.update(processedCount, {
          avgScore:
            processedCount > 0
              ? Math.round(totalScore / (processedCount - errorCount)).toString()
              : 'N/A',
        });
        // Continue with next job (don't fail entire batch)
      }
    }

    evalProgressBar.stop();

    // Final summary
    console.log('\n┌─────────────────────────────────────────────────────────┐');
    console.log('│          ✅ EVALUATION COMPLETE                         │');
    console.log('└─────────────────────────────────────────────────────────┘');
    console.log(`✅ Successfully evaluated: ${evaluatedCount}`);
    console.log(`🚫 Filtered by keywords: ${filteredCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    if (evaluatedCount > 0) {
      const avgScore = Math.round(totalScore / evaluatedCount);
      console.log(`⭐ Average score: ${avgScore}/100`);
      const highScoring =
        evaluatedCount > 0
          ? '(Check database for jobs ≥' + preferences.minScoreThreshold + ')'
          : '';
      console.log(`🎯 High-scoring jobs: ${highScoring}\n`);
    }
  }
}
