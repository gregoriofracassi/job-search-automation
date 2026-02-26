import { IEvent } from '@nestjs/cqrs';

/**
 * Domain event fired after jobs have been scraped from Apify and saved to the database.
 *
 * This event allows other modules (e.g., LLM evaluation) to react to newly scraped jobs
 * without tight coupling between modules.
 *
 * Per architecture rules (Events Rules, line 122-125):
 * - Events are published from command handlers after state is persisted
 * - Event handlers only handle side effects (enqueue jobs, notify other modules)
 * - Multiple modules may register handlers for the same event
 */
export class JobsScrapedEvent implements IEvent {
  constructor(
    public readonly jobIds: string[],
    public readonly searchConfigId?: string,
    public readonly scrapeKeywords?: string,
    public readonly scrapeLocation?: string,
  ) {}
}
