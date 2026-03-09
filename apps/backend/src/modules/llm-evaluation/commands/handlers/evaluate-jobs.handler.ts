import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import * as cliProgress from 'cli-progress';
import { EvaluateJobsCommand } from '../evaluate-jobs.command';
import { JobRepository } from '@/modules/jobs/domain/repositories/job.repository';
import { UserPreferenceRepository } from '../../domain/repositories/user-preference.repository';
import { LlmEvaluationService } from '../../domain/services/llm-evaluation.service';

@CommandHandler(EvaluateJobsCommand)
export class EvaluateJobsHandler implements ICommandHandler<EvaluateJobsCommand> {
  private readonly logger = new Logger(EvaluateJobsHandler.name);

  constructor(
    private readonly jobRepository: JobRepository,
    private readonly userPreferenceRepository: UserPreferenceRepository,
    private readonly llmEvaluationService: LlmEvaluationService,
  ) {}

  async execute(command: EvaluateJobsCommand): Promise<{ evaluatedCount: number }> {
    const preferences = await this.userPreferenceRepository.findDefault();

    if (!preferences) {
      this.logger.warn('No user preferences found, skipping evaluation');
      return { evaluatedCount: 0 };
    }

    // Get job IDs to evaluate
    let jobIds: string[];
    if (command.jobIds && command.jobIds.length > 0) {
      // Evaluate specific jobs
      jobIds = command.jobIds;
    } else {
      // Evaluate jobs based on filters
      const allJobs = await this.jobRepository.list();

      if (command.forceReEvaluate) {
        // Re-evaluate ALL jobs
        jobIds = allJobs.map((job) => job.id);
      } else if (command.scoredBefore) {
        // Re-evaluate jobs scored before the specified timestamp
        const scoredBeforeDate = command.scoredBefore;
        jobIds = allJobs
          .filter((job) => {
            // Include jobs that were scored before the timestamp
            if (job.scoredAt && job.scoredAt < scoredBeforeDate) {
              return true;
            }
            // Also include jobs that have never been scored
            if (job.score === null || job.scoredAt === null) {
              return true;
            }
            return false;
          })
          .map((job) => job.id);
      } else {
        // Evaluate only unevaluated jobs (where score is null)
        jobIds = allJobs.filter((job) => job.score === null).map((job) => job.id);
      }
    }

    if (jobIds.length === 0) {
      this.logger.log('No jobs to evaluate');
      return { evaluatedCount: 0 };
    }

    this.logger.log('\n🤖 LLM EVALUATION STARTED');
    this.logger.log(`📊 Jobs to evaluate: ${jobIds.length}`);
    this.logger.log(`🧠 Model: ${preferences.llmModel}`);
    this.logger.log(`🎯 Min score threshold: ${preferences.minScoreThreshold}\n`);

    // Create progress bar
    const evalProgressBar = new cliProgress.SingleBar(
      {
        format:
          '🧠 Evaluating Jobs |{bar}| {percentage}% | {value}/{total} jobs | ETA: {eta}s | ⭐ Avg Score: {avgScore}',
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true,
        forceRedraw: true,
      },
      cliProgress.Presets.shades_classic,
    );

    let evaluatedCount = 0;
    let errorCount = 0;
    let totalScore = 0;
    let processedCount = 0;

    evalProgressBar.start(jobIds.length, 0, { avgScore: 'N/A' });

    for (const jobId of jobIds) {
      try {
        const job = await this.jobRepository.findById(jobId);

        if (!job) {
          this.logger.warn(`Job ${jobId} not found, skipping`);
          continue;
        }

        // Skip if already evaluated (with appropriate conditions)
        const shouldSkip =
          !command.forceReEvaluate &&
          !command.scoredBefore &&
          job.score !== null &&
          job.score !== undefined;

        if (shouldSkip) {
          continue;
        }

        // If scoredBefore is set, skip jobs scored after that timestamp
        if (command.scoredBefore && job.scoredAt && job.scoredAt >= command.scoredBefore) {
          continue;
        }

        // Evaluate job with LLM
        const evaluation = await this.llmEvaluationService.evaluateJob(
          job,
          preferences.systemPrompt,
          preferences.scoringCriteria,
          preferences.llmModel,
        );

        // Update job with score
        job.applyScore(evaluation.score, evaluation.scoreReasoning, evaluation.scoreCriteria);
        await this.jobRepository.save(job);

        evaluatedCount++;
        totalScore += evaluation.score;
        processedCount++;
        const avgScore = Math.round(totalScore / processedCount);
        evalProgressBar.update(processedCount, { avgScore: avgScore.toString() });

        // Log progress every 50 jobs
        if (processedCount % 50 === 0) {
          evalProgressBar.stop();
          this.logger.log(
            `Progress: ${processedCount}/${jobIds.length} jobs (${Math.round((processedCount / jobIds.length) * 100)}%) | Avg Score: ${avgScore}`,
          );
          evalProgressBar.start(jobIds.length, processedCount, { avgScore: avgScore.toString() });
        }
      } catch (error) {
        errorCount++;
        processedCount++;
        const avgScore =
          processedCount > errorCount
            ? Math.round(totalScore / (processedCount - errorCount)).toString()
            : 'N/A';
        evalProgressBar.update(processedCount, { avgScore });
      }
    }

    evalProgressBar.stop();

    // Final summary
    this.logger.log('\n✅ EVALUATION COMPLETE');
    this.logger.log(`✅ Successfully evaluated: ${evaluatedCount}`);
    this.logger.log(`❌ Errors: ${errorCount}`);
    if (evaluatedCount > 0) {
      const avgScore = Math.round(totalScore / evaluatedCount);
      this.logger.log(`⭐ Average score: ${avgScore}/100\n`);
    }

    return { evaluatedCount };
  }
}
