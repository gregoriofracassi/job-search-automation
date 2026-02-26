import { IEvent } from '@nestjs/cqrs';
import { JobStatus } from '../enums/job-status.enum';

/**
 * Domain event fired when a job's status changes (e.g., NEW -> APPLIED).
 *
 * This event allows tracking job application funnel, triggering analytics,
 * or notifying external systems.
 *
 * Per architecture rules (Events Rules, line 122-125):
 * - Events are published from command handlers after state is persisted
 * - Event handlers only handle side effects
 */
export class JobStatusChangedEvent implements IEvent {
  constructor(
    public readonly jobId: string,
    public readonly previousStatus: JobStatus,
    public readonly newStatus: JobStatus,
    public readonly appliedAt?: Date,
  ) {}
}
