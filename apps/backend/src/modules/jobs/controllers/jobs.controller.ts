import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Query } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ListJobsQuery } from '../queries/impl/list-jobs.query';
import { GetJobQuery } from '../queries/impl/get-job.query';
import { UpdateJobStatusCommand } from '../commands/impl/update-job-status.command';
import { DeleteJobCommand } from '../commands/impl/delete-job.command';
import { ListJobsRequestDto } from '../dto/requests/list-jobs.request.dto';
import { UpdateJobStatusRequestDto } from '../dto/requests/update-job-status.request.dto';
import { JobResponseDto } from '../dto/responses/job.response.dto';
import { Job } from '../domain/models/job.model';

@ApiTags('Jobs')
@Controller('jobs')
export class JobsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List all jobs',
    description: 'Supports filtering by status, score range, employment type, and location.',
  })
  async list(@Query() query: ListJobsRequestDto): Promise<JobResponseDto[]> {
    const jobs: Job[] = await this.queryBus.execute(
      new ListJobsQuery({
        status: query.status,
        minScore: query.minScore,
        maxScore: query.maxScore,
        employmentType: query.employmentType,
        location: query.location,
      }),
    );
    return jobs.map(JobResponseDto.fromDomain);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single job by ID' })
  async get(@Param('id') id: string): Promise<JobResponseDto> {
    const job: Job = await this.queryBus.execute(new GetJobQuery(id));
    return JobResponseDto.fromDomain(job);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Advance job status',
    description:
      'Transitions the job through its lifecycle (save → apply → interview → offer/reject/withdraw). Invalid transitions return 422.',
  })
  @HttpCode(200)
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateJobStatusRequestDto,
  ): Promise<JobResponseDto> {
    await this.commandBus.execute(new UpdateJobStatusCommand(id, dto.status, dto.notes));
    const job: Job = await this.queryBus.execute(new GetJobQuery(id));
    return JobResponseDto.fromDomain(job);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a job' })
  @HttpCode(204)
  async delete(@Param('id') id: string): Promise<void> {
    await this.commandBus.execute(new DeleteJobCommand(id));
  }
}
