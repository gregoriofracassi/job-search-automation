import { ApiProperty } from '@nestjs/swagger';
import { LinkedinJobResponseDto } from './linkedin-job.response.dto';

export class ScrapeEnqueuedResponseDto {
  @ApiProperty({
    description: 'BullMQ job ID — use this to poll for results',
    example: '42',
  })
  jobId!: string;

  @ApiProperty({ example: 'queued' })
  status!: 'queued';
}

export class ScrapeResultsResponseDto {
  @ApiProperty({ example: '42' })
  jobId!: string;

  @ApiProperty({
    enum: ['waiting', 'active', 'completed', 'failed'],
    example: 'completed',
  })
  status!: 'waiting' | 'active' | 'completed' | 'failed';

  @ApiProperty({ type: [LinkedinJobResponseDto], nullable: true })
  results!: LinkedinJobResponseDto[] | null;

  @ApiProperty({ nullable: true, example: null })
  error!: string | null;
}
