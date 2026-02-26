import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { JobStatusChangedEvent } from '../job-status-changed.event';

/**
 * Placeholder event handler for JobStatusChangedEvent.
 *
 * Per architecture rules (Events Rules, line 124):
 * "Event handlers only handle side effects (enqueue jobs, notify other modules)."
 *
 * Current implementation: Logs the event for visibility.
 * Future implementations could:
 * - Track application funnel metrics (NEW -> APPLIED conversion rate)
 * - Sync status to external ATS (Applicant Tracking System)
 * - Send confirmation emails when status changes to APPLIED
 * - Update dashboard/analytics in real-time
 */
@EventsHandler(JobStatusChangedEvent)
export class JobStatusChangedHandler implements IEventHandler<JobStatusChangedEvent> {
  private readonly logger = new Logger(JobStatusChangedHandler.name);

  async handle(event: JobStatusChangedEvent): Promise<void> {
    this.logger.log(
      `JobStatusChangedEvent received: jobId=${event.jobId}, ` +
        `${event.previousStatus} -> ${event.newStatus}`,
    );

    // TODO: Future side effects:
    // - await this.analyticsService.trackStatusChange(event)
    // - if (event.newStatus === JobStatus.APPLIED) {
    //     await this.emailService.sendApplicationConfirmation(event.jobId)
    //   }
  }
}
