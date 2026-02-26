import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ScrapeLinkedinJobsCommand } from '../impl/scrape-linkedin-jobs.command';
import { APIFY_QUEUE } from '@/queue/queue.module';

export const SCRAPE_LINKEDIN_JOBS_JOB = 'scrape-linkedin-jobs';

@CommandHandler(ScrapeLinkedinJobsCommand)
export class ScrapeLinkedinJobsHandler implements ICommandHandler<
  ScrapeLinkedinJobsCommand,
  string
> {
  constructor(@InjectQueue(APIFY_QUEUE) private readonly apifyQueue: Queue) {}

  async execute(command: ScrapeLinkedinJobsCommand): Promise<string> {
    const job = await this.apifyQueue.add(SCRAPE_LINKEDIN_JOBS_JOB, command.input);

    return job.id!;
  }
}
