import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { BullModule } from '@nestjs/bullmq';
import { ApifyService } from './apify.service';
import { ApifyProcessor } from './apify.processor';
import { ApifyController } from './controllers/apify.controller';
import { ScrapeLinkedinJobsHandler } from './commands/handlers/scrape-linkedin-jobs.handler';
import { GetScrapeJobResultsHandler } from './queries/handlers/get-scrape-job-results.handler';
import { ApifyScrapeService } from './domain/services/apify-scrape.service';
import { APIFY_QUEUE } from '@/queue/queue.module';

const CommandHandlers = [ScrapeLinkedinJobsHandler];
const QueryHandlers = [GetScrapeJobResultsHandler];
const Services = [ApifyScrapeService];

@Module({
  imports: [
    CqrsModule,
    // The queue is registered globally in QueueModule; we just inject it here.
    BullModule.registerQueue({ name: APIFY_QUEUE }),
  ],
  controllers: [ApifyController],
  providers: [ApifyService, ApifyProcessor, ...Services, ...CommandHandlers, ...QueryHandlers],
})
export class ApifyModule {}
