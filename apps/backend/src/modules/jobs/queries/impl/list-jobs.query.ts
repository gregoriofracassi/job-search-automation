import { ListJobsFilter } from '../../domain/repositories/job.repository';

export class ListJobsQuery {
  constructor(public readonly filter: ListJobsFilter) {}
}
