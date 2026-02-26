import { Injectable } from '@nestjs/common';

/**
 * Domain service for job-related business logic.
 *
 * Place complex or reusable logic here when it grows beyond what a single
 * command/query handler should own — e.g. bulk status transitions, scoring
 * aggregation, or any operation shared across multiple handlers.
 *
 * May be injected into command handlers, query handlers, or the controller.
 */
@Injectable()
export class JobService {}
