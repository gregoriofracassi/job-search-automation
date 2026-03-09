export class EvaluateJobsCommand {
  constructor(
    public readonly jobIds?: string[],
    public readonly forceReEvaluate?: boolean,
    public readonly scoredBefore?: Date,
  ) {}
}
