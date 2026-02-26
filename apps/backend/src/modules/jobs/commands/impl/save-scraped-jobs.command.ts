import { LinkedinJobResponseDto } from '@/modules/apify/dto/responses/linkedin-job.response.dto';

export class SaveScrapedJobsCommand {
  constructor(public readonly jobs: LinkedinJobResponseDto[]) {}
}
