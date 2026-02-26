import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { CommandBus, EventBus } from '@nestjs/cqrs';
import { Job } from 'bullmq';
import { ApifyService } from './apify.service';
import { LinkedinJobResponseDto } from './dto/responses/linkedin-job.response.dto';
import { APIFY_QUEUE } from '@/queue/queue.module';
import { SCRAPE_LINKEDIN_JOBS_JOB } from './commands/handlers/scrape-linkedin-jobs.handler';
import { SaveScrapedJobsCommand } from '@/modules/jobs/commands/impl/save-scraped-jobs.command';
import { JobsScrapedEvent } from '@/modules/jobs/domain/events/jobs-scraped.event';
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
    private readonly eventBus: EventBus,
  ) {
    super();
  }

  async process(job: Job<ScrapeJobData>): Promise<LinkedinJobResponseDto[]> {
    if (job.name !== SCRAPE_LINKEDIN_JOBS_JOB) {
      this.logger.warn(`Unknown job name: ${job.name}`);
      return [];
    }

    this.logger.log(`Processing job ${job.id} — scraping LinkedIn jobs`);

    // Use provided URLs or fall back to hardcoded list
    const urls = job.data.urls ?? LINKEDIN_SEARCH_URLS;
    const count = job.data.count;
    const scrapeJobDetails = job.data.scrapeJobDetails ?? false;
    const scrapeSkills = job.data.scrapeSkills ?? false;
    const scrapeCompany = job.data.scrapeCompany ?? false;

    // Process each URL sequentially (actor accepts single URL per run)
    const allResults: LinkedinJobResponseDto[] = [];

    for (const url of urls) {
      this.logger.log(`Scraping URL: ${url}`);

      const results = await this.apifyService.runAndCollect(
        url,
        count,
        scrapeJobDetails,
        scrapeSkills,
        scrapeCompany,
      );

      this.logger.log(`Retrieved ${results.length} jobs from ${url}`);
      allResults.push(...results);
    }

    this.logger.log(`Job ${job.id} complete — ${allResults.length} jobs scraped, saving to DB`);

    const jobIds = await this.commandBus.execute(new SaveScrapedJobsCommand(allResults));

    // Per architecture rules (Events Rules, line 122-123):
    // "Domain events are dispatched in-process via the NestJS EventBus"
    // "Events are published from command handlers after state is persisted"
    //
    // Note: In this case, we publish from the processor (not handler) because
    // the processor orchestrates the entire scrape workflow. The SaveScrapedJobsCommand
    // is a simple persistence operation that returns jobIds for event publishing.
    this.eventBus.publish(
      new JobsScrapedEvent(
        jobIds,
        undefined, // searchConfigId (future: will be passed from scheduler)
        undefined, // scrapeKeywords (extracted from URL if needed)
        undefined, // scrapeLocation (extracted from URL if needed)
      ),
    );

    this.logger.log(`JobsScrapedEvent published for ${jobIds.length} jobs`);

    return allResults;
  }
}
