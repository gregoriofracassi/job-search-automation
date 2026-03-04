/**
 * Exception thrown when a job is filtered out by keyword matching.
 * Not an HTTP exception - used for internal flow control.
 */
export class KeywordFilteredException extends Error {
  constructor(
    public readonly jobId: string,
    public readonly matchedKeywords: string[],
  ) {
    super(`Job ${jobId} filtered out (matched: ${matchedKeywords.join(', ')})`);
    this.name = 'KeywordFilteredException';
  }
}
