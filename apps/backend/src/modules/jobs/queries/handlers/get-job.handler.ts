import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetJobQuery } from '../impl/get-job.query';
import { JobRepository } from '../../domain/repositories/job.repository';
import { Job } from '../../domain/models/job.model';
import { JobNotFoundException } from '../../exceptions/job-not-found.exception';

@QueryHandler(GetJobQuery)
export class GetJobHandler implements IQueryHandler<GetJobQuery, Job> {
  constructor(private readonly jobRepository: JobRepository) {}

  async execute(query: GetJobQuery): Promise<Job> {
    const job = await this.jobRepository.findById(query.id);
    if (!job) throw new JobNotFoundException(query.id);
    return job;
  }
}
