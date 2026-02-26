import { Injectable } from '@nestjs/common';

/**
 * Domain service for Apify scrape orchestration.
 *
 * Place complex logic here when it grows beyond what a single command/query
 * handler should own — e.g. composing multiple scrape runs, applying
 * deduplication rules before saving, or coordinating across repositories.
 *
 * The low-level Apify API adapter lives in ApifyService (module root).
 */
@Injectable()
export class ApifyScrapeService {}
