import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { JobEvaluatedEvent } from '../job-evaluated.event';

/**
 * Placeholder event handler for JobEvaluatedEvent.
 *
 * Per architecture rules (Events Rules, line 125):
 * "Multiple modules may register handlers for the same event."
 *
 * Current implementation: Logs the event for visibility.
 * Future implementations could:
 * - Send email notifications for high-scoring jobs (score >= 90)
 * - Update analytics/metrics
 * - Post to Slack channel
 * - Trigger auto-apply for easy-apply jobs above threshold
 */
@EventsHandler(JobEvaluatedEvent)
export class JobEvaluatedHandler implements IEventHandler<JobEvaluatedEvent> {
  private readonly logger = new Logger(JobEvaluatedHandler.name);

  async handle(event: JobEvaluatedEvent): Promise<void> {
    this.logger.log(`JobEvaluatedEvent received: jobId=${event.jobId}, score=${event.score}/100`);

    // TODO: Future side effects:
    // - if (event.score >= 90) await this.notificationService.sendEmail(...)
    // - await this.analyticsService.recordJobScore(event.jobId, event.score)
    // - await this.slackService.postHighScoringJob(event.jobId, event.score)
  }
}
