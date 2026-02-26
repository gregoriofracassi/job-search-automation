import { IEvent } from '@nestjs/cqrs';

/**
 * Domain event fired after a job has been evaluated by the LLM.
 *
 * This event allows other modules to react to job scoring (e.g., send notifications
 * for high-scoring jobs, update analytics, etc.)
 *
 * Per architecture rules (Events Rules, line 122-125):
 * - Events are published from command handlers after state is persisted
 * - Event handlers only handle side effects
 */
export class JobEvaluatedEvent implements IEvent {
  constructor(
    public readonly jobId: string,
    public readonly score: number,
    public readonly scoreReasoning: string,
    public readonly scoreCriteria: Record<string, number>,
  ) {}
}
