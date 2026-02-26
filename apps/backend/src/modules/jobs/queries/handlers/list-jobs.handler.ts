import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ListJobsQuery } from '../impl/list-jobs.query';
import { JobRepository } from '../../domain/repositories/job.repository';
import { Job } from '../../domain/models/job.model';

@QueryHandler(ListJobsQuery)
export class ListJobsHandler implements IQueryHandler<ListJobsQuery, Job[]> {
  constructor(private readonly jobRepository: JobRepository) {}

  execute(query: ListJobsQuery): Promise<Job[]> {
    return this.jobRepository.list(query.filter);
  }
}
