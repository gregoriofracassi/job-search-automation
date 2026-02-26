export class ApifyRunFailedException extends Error {
  constructor(details?: string) {
    super(details ? `Apify actor run failed: ${details}` : 'Apify actor run failed');
    this.name = 'ApifyRunFailedException';
  }
}
