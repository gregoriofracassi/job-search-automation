import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { UserPreferenceRepository } from './domain/repositories/user-preference.repository';
import { KeywordFilterService } from './domain/services/keyword-filter.service';
import { LlmEvaluationService } from './domain/services/llm-evaluation.service';
import { JobsScrapedEvaluationHandler } from './events/handlers/jobs-scraped.handler';
import { DatabaseModule } from '@/database/database.module';
import { JobsModule } from '@/modules/jobs/jobs.module';

const EventHandlers = [JobsScrapedEvaluationHandler];

@Module({
  imports: [CqrsModule, DatabaseModule, JobsModule],
  providers: [
    UserPreferenceRepository,
    KeywordFilterService,
    LlmEvaluationService,
    ...EventHandlers,
  ],
  exports: [UserPreferenceRepository, KeywordFilterService, LlmEvaluationService],
})
export class LlmEvaluationModule {}
