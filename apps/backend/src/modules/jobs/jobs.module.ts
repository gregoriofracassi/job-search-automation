import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { JobRepository } from './domain/repositories/job.repository';
import { JobsController } from './controllers/jobs.controller';
import { SaveScrapedJobsHandler } from './commands/handlers/save-scraped-jobs.handler';
import { UpdateJobStatusHandler } from './commands/handlers/update-job-status.handler';
import { DeleteJobHandler } from './commands/handlers/delete-job.handler';
import { ListJobsHandler } from './queries/handlers/list-jobs.handler';
import { GetJobHandler } from './queries/handlers/get-job.handler';
import { JobService } from './domain/services/job.service';
import { JobEvaluatedHandler } from './domain/events/handlers/job-evaluated.handler';
import { JobStatusChangedHandler } from './domain/events/handlers/job-status-changed.handler';

const CommandHandlers = [SaveScrapedJobsHandler, UpdateJobStatusHandler, DeleteJobHandler];
const QueryHandlers = [ListJobsHandler, GetJobHandler];
const EventHandlers = [JobEvaluatedHandler, JobStatusChangedHandler];
const Services = [JobService];

@Module({
  imports: [CqrsModule],
  controllers: [JobsController],
  providers: [JobRepository, ...Services, ...CommandHandlers, ...QueryHandlers, ...EventHandlers],
  exports: [JobRepository],
})
export class JobsModule {}
