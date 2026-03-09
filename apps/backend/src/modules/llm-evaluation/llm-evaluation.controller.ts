import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiProperty } from '@nestjs/swagger';
import { CommandBus } from '@nestjs/cqrs';
import { IsArray, IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';
import { EvaluateJobsCommand } from './commands/evaluate-jobs.command';

class EvaluateJobsDto {
  @ApiProperty({
    description:
      'Optional: specific job IDs to evaluate. If not provided, evaluates all unevaluated jobs',
    required: false,
    type: [String],
    example: ['job-id-1', 'job-id-2'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  jobIds?: string[];

  @ApiProperty({
    description: 'Optional: if true, re-evaluates ALL jobs (including already evaluated ones)',
    required: false,
    type: Boolean,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  forceReEvaluate?: boolean;

  @ApiProperty({
    description:
      'Optional: re-evaluate jobs scored before this timestamp (ISO 8601 format). Useful when scoring criteria changed.',
    required: false,
    type: String,
    example: '2026-03-07T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  scoredBefore?: string;
}

@ApiTags('LLM Evaluation')
@Controller('api/llm')
export class LlmEvaluationController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('evaluate')
  @ApiOperation({
    summary: 'Trigger LLM evaluation for jobs',
    description:
      'Evaluates jobs using LLM. Can evaluate specific jobs by ID or all unevaluated jobs if no IDs provided. Use forceReEvaluate to re-evaluate all jobs, or scoredBefore to re-evaluate jobs scored before a specific timestamp.',
  })
  async evaluateJobs(@Body() dto: EvaluateJobsDto) {
    const scoredBeforeDate = dto.scoredBefore ? new Date(dto.scoredBefore) : undefined;

    const result = await this.commandBus.execute<EvaluateJobsCommand, { evaluatedCount: number }>(
      new EvaluateJobsCommand(dto.jobIds, dto.forceReEvaluate, scoredBeforeDate),
    );

    return {
      message: 'LLM evaluation completed',
      evaluatedCount: result.evaluatedCount,
    };
  }
}
