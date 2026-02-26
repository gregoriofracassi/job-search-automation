import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { JobsScrapedEvent } from '../jobs-scraped.event';

/**
 * Placeholder event handler for JobsScrapedEvent.
 *
 * Per architecture rules (Events Rules, line 124):
 * "Event handlers only handle side effects (enqueue jobs, notify other modules).
 * They never modify the entity that originated the event."
 *
 * Per Saga Rules (line 131):
 * "For simple single-step side effects (send an email, enqueue a job),
 * use a plain @EventsHandler instead."
 *
 * Current implementation: Logs the event for visibility.
 * Future implementation: This will be moved to the LLM evaluation module,
 * where it will trigger job scoring.
 */
@EventsHandler(JobsScrapedEvent)
export class JobsScrapedHandler implements IEventHandler<JobsScrapedEvent> {
  private readonly logger = new Logger(JobsScrapedHandler.name);

  async handle(event: JobsScrapedEvent): Promise<void> {
    this.logger.log(
      `JobsScrapedEvent received: ${event.jobIds.length} jobs scraped ` +
        `(keywords: ${event.scrapeKeywords ?? 'none'}, location: ${event.scrapeLocation ?? 'none'})`,
    );

    // TODO: When LLM evaluation module is implemented, this handler should be moved there
    // and will trigger job evaluation:
    //
    // for (const jobId of event.jobIds) {
    //   await this.commandBus.execute(new EvaluateJobCommand(jobId));
    // }
  }
}
