import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { JobStatus } from '../../domain/enums/job-status.enum';

const MANUALLY_SETTABLE = [
  JobStatus.SAVED,
  JobStatus.APPLIED,
  JobStatus.INTERVIEWING,
  JobStatus.OFFERED,
  JobStatus.REJECTED,
  JobStatus.WITHDRAWN,
] as const;

export class UpdateJobStatusRequestDto {
  @ApiProperty({
    enum: MANUALLY_SETTABLE,
    description: 'Target status. NEW and EVALUATED are set by the system, not manually.',
  })
  @IsEnum(JobStatus)
  status!: JobStatus;

  @ApiPropertyOptional({
    description: 'Optional notes to attach to the job',
    example: 'Applied via LinkedIn Easy Apply',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
