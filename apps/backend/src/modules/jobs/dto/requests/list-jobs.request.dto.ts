import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { JobStatus } from '../../domain/enums/job-status.enum';

export class ListJobsRequestDto {
  @ApiPropertyOptional({
    enum: JobStatus,
    isArray: true,
    description: 'Filter by one or more statuses',
    example: [JobStatus.EVALUATED, JobStatus.SAVED],
  })
  @IsOptional()
  @IsEnum(JobStatus, { each: true })
  status?: JobStatus[];

  @ApiPropertyOptional({ description: 'Minimum LLM score (0–100)', example: 70 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  minScore?: number;

  @ApiPropertyOptional({ description: 'Maximum LLM score (0–100)', example: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  maxScore?: number;

  @ApiPropertyOptional({
    description: 'Filter by employment type (partial match)',
    example: 'Full-time',
  })
  @IsOptional()
  @IsString()
  employmentType?: string;

  @ApiPropertyOptional({
    description: 'Filter by location (partial match)',
    example: 'San Francisco',
  })
  @IsOptional()
  @IsString()
  location?: string;
}
