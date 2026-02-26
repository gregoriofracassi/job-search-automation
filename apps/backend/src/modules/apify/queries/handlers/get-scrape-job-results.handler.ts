import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { GetScrapeJobResultsQuery } from '../impl/get-scrape-job-results.query';
import { ScrapeResultsResponseDto } from '../../dto/responses/scrape-run.response.dto';
import { LinkedinJobResponseDto } from '../../dto/responses/linkedin-job.response.dto';
import { APIFY_QUEUE } from '@/queue/queue.module';

@QueryHandler(GetScrapeJobResultsQuery)
export class GetScrapeJobResultsHandler implements IQueryHandler<
  GetScrapeJobResultsQuery,
  ScrapeResultsResponseDto
> {
  constructor(@InjectQueue(APIFY_QUEUE) private readonly apifyQueue: Queue) {}

  async execute(query: GetScrapeJobResultsQuery): Promise<ScrapeResultsResponseDto> {
    const job = await this.apifyQueue.getJob(query.jobId);

    if (!job) {
      return { jobId: query.jobId, status: 'failed', results: null, error: 'Job not found' };
    }

    const state = await job.getState();

    const normalizedState = (['waiting', 'active', 'completed', 'failed'] as const).includes(
      state as 'waiting' | 'active' | 'completed' | 'failed',
    )
      ? (state as 'waiting' | 'active' | 'completed' | 'failed')
      : 'waiting';

    const results: LinkedinJobResponseDto[] | null =
      state === 'completed' ? (job.returnvalue as LinkedinJobResponseDto[]) : null;

    const error: string | null = state === 'failed' ? String(job.failedReason) : null;

    return { jobId: query.jobId, status: normalizedState, results, error };
  }
}
