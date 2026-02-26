import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ScrapeLinkedinJobsRequestDto } from '../dto/requests/scrape-linkedin-jobs.request.dto';
import {
  ScrapeEnqueuedResponseDto,
  ScrapeResultsResponseDto,
} from '../dto/responses/scrape-run.response.dto';
import { ScrapeLinkedinJobsCommand } from '../commands/impl/scrape-linkedin-jobs.command';
import { GetScrapeJobResultsQuery } from '../queries/impl/get-scrape-job-results.query';

@ApiTags('Apify')
@Controller('apify')
export class ApifyController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  /**
   * Enqueues a LinkedIn scrape job. Returns immediately with a jobId.
   * The actual scrape runs asynchronously via BullMQ (~60-120 seconds).
   * Poll GET /apify/jobs/:jobId to check status and retrieve results.
   */
  @Post('scrape')
  @ApiOperation({
    summary: 'Enqueue a LinkedIn job scrape',
    description:
      'Starts an Apify actor run in the background. Returns a jobId to poll for results.',
  })
  async scrape(@Body() dto: ScrapeLinkedinJobsRequestDto): Promise<ScrapeEnqueuedResponseDto> {
    const jobId = await this.commandBus.execute(new ScrapeLinkedinJobsCommand(dto));

    return { jobId, status: 'queued' };
  }

  /**
   * Polls the status of an enqueued scrape job.
   * When status is "completed", the results array is populated.
   */
  @Get('jobs/:jobId')
  @ApiOperation({
    summary: 'Get scrape job status and results',
    description:
      'Returns the current state of a scrape job. Results are available once status is "completed".',
  })
  async getJobResults(@Param('jobId') jobId: string): Promise<ScrapeResultsResponseDto> {
    return this.queryBus.execute(new GetScrapeJobResultsQuery(jobId));
  }
}
