import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { UserPreferenceRepository } from './domain/repositories/user-preference.repository';
import { KeywordFilterService } from './domain/services/keyword-filter.service';
import { LlmEvaluationService } from './domain/services/llm-evaluation.service';
import { JobsScrapedEvaluationHandler } from './events/handlers/jobs-scraped.handler';
import { LlmEvaluationController } from './llm-evaluation.controller';
import { EvaluateJobsHandler } from './commands/handlers/evaluate-jobs.handler';
import { DatabaseModule } from '@/database/database.module';
import { JobsModule } from '@/modules/jobs/jobs.module';

const EventHandlers = [JobsScrapedEvaluationHandler];
const CommandHandlers = [EvaluateJobsHandler];

@Module({
  imports: [CqrsModule, DatabaseModule, JobsModule],
  controllers: [LlmEvaluationController],
  providers: [
    UserPreferenceRepository,
    KeywordFilterService,
    LlmEvaluationService,
    ...EventHandlers,
    ...CommandHandlers,
  ],
  exports: [UserPreferenceRepository, KeywordFilterService, LlmEvaluationService],
})
export class LlmEvaluationModule {}
