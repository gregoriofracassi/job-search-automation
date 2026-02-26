import { JobStatus } from '../../domain/enums/job-status.enum';

export class UpdateJobStatusCommand {
  constructor(
    public readonly id: string,
    public readonly status: JobStatus,
    public readonly notes?: string,
  ) {}
}
