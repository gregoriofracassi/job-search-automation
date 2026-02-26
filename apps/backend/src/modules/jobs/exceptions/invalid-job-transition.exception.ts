import { JobStatus } from '../domain/enums/job-status.enum';

export class InvalidJobTransitionException extends Error {
  constructor(from: JobStatus, to: string) {
    super(`Cannot transition job from ${from} to ${to}`);
    this.name = 'InvalidJobTransitionException';
  }
}
