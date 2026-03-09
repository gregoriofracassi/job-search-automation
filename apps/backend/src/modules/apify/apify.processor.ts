import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Job } from 'bullmq';
import * as cliProgress from 'cli-progress';
import { ApifyService } from './apify.service';
import { LinkedinJobResponseDto } from './dto/responses/linkedin-job.response.dto';
import { APIFY_QUEUE } from '@/queue/queue.module';
import { SCRAPE_LINKEDIN_JOBS_JOB } from './commands/handlers/scrape-linkedin-jobs.handler';
import { SaveScrapedJobsCommand } from '@/modules/jobs/commands/impl/save-scraped-jobs.command';
import { LINKEDIN_SEARCH_URLS } from './linkedin-search-urls.config';

export interface ScrapeJobData {
  urls?: string[]; // Array of LinkedIn search URLs to scrape (optional, uses hardcoded if not provided)
  count?: number; // Total number of records to scrape per URL (optional, scrapes all if not provided)
  scrapeJobDetails?: boolean; // Scrape benefits, hiring team, company info (slower)
  scrapeSkills?: boolean; // Scrape skills requirements (slower)
  scrapeCompany?: boolean; // Scrape company details (slower)
}

@Processor(APIFY_QUEUE)
export class ApifyProcessor extends WorkerHost {
  private readonly logger = new Logger(ApifyProcessor.name);

  constructor(
    private readonly apifyService: ApifyService,
    private readonly commandBus: CommandBus,
  ) {
    super();
  }

  async process(job: Job<ScrapeJobData>): Promise<LinkedinJobResponseDto[]> {
    if (job.name !== SCRAPE_LINKEDIN_JOBS_JOB) {
      this.logger.warn(`Unknown job name: ${job.name}`);
      return [];
    }

    // Use provided URLs or fall back to hardcoded list
    const urls = job.data.urls ?? LINKEDIN_SEARCH_URLS;
    const count = job.data.count;
    const scrapeJobDetails = job.data.scrapeJobDetails ?? false;
    const scrapeSkills = job.data.scrapeSkills ?? false;
    const scrapeCompany = job.data.scrapeCompany ?? false;

    // Log summary
    this.logger.log('\n🚀 LINKEDIN JOB SCRAPING STARTED');
    this.logger.log(`📋 URLs to scrape: ${urls.length}`);
    this.logger.log(`🔢 Jobs per URL: ${count ?? 'unlimited'}`);
    this.logger.log(
      `⚙️  Extra data: ${scrapeJobDetails || scrapeSkills || scrapeCompany ? 'Yes' : 'No'}\n`,
    );

    // Create progress bar for URL scraping
    const urlProgressBar = new cliProgress.SingleBar({
      format: '🌐 Scraping URLs   |{bar}| {percentage}% | {value}/{total} URLs | ETA: {eta}s',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true,
    });

    // Process each URL sequentially (actor accepts single URL per run)
    const allResults: LinkedinJobResponseDto[] = [];
    urlProgressBar.start(urls.length, 0);

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];

      const results = await this.apifyService.runAndCollect(
        url,
        count,
        scrapeJobDetails,
        scrapeSkills,
        scrapeCompany,
      );

      allResults.push(...results);
      urlProgressBar.update(i + 1);
    }

    urlProgressBar.stop();

    this.logger.log(`\n✨ Scraping complete!`);
    this.logger.log(`   📦 Total job listings retrieved from LinkedIn: ${allResults.length}`);
    this.logger.log(`   💾 Saving to database...\n`);

    const jobIds = await this.commandBus.execute(new SaveScrapedJobsCommand(allResults));

    this.logger.log(`✅ Database save complete!`);
    this.logger.log(`   💚 New jobs saved: ${jobIds.length}`);
    this.logger.log(`   ⚠️  Duplicates skipped: ${allResults.length - jobIds.length}\n`);

    // DISABLED: Automatic LLM evaluation after scraping
    // Evaluation must now be triggered manually via POST /api/api/llm/evaluate
    //
    // Per architecture rules (Events Rules, line 122-123):
    // "Domain events are dispatched in-process via the NestJS EventBus"
    // "Events are published from command handlers after state is persisted"
    //
    // Note: In this case, we publish from the processor (not handler) because
    // the processor orchestrates the entire scrape workflow. The SaveScrapedJobsCommand
    // is a simple persistence operation that returns jobIds for event publishing.
    //
    // this.eventBus.publish(
    //   new JobsScrapedEvent(
    //     jobIds,
    //     undefined, // searchConfigId (future: will be passed from scheduler)
    //     undefined, // scrapeKeywords (extracted from URL if needed)
    //     undefined, // scrapeLocation (extracted from URL if needed)
    //   ),
    // );
    //
    // this.logger.log(`📤 JobsScrapedEvent published for ${jobIds.length} jobs`);

    return allResults;
  }
}
