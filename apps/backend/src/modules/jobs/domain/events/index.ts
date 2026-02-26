/**
 * Domain events for the Jobs module.
 *
 * Per architecture rules (Events Rules, line 122-125):
 * - Events are dispatched in-process via NestJS EventBus
 * - Events are published after state is persisted
 * - Event handlers only handle side effects
 * - Multiple modules may register handlers for the same event
 */

export * from './jobs-scraped.event';
export * from './job-evaluated.event';
export * from './job-status-changed.event';
export * from './handlers/jobs-scraped.handler';
export * from './handlers/job-evaluated.handler';
export * from './handlers/job-status-changed.handler';
