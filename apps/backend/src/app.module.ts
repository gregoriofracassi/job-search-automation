import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DatabaseModule } from './database/database.module';
import { QueueModule } from './queue/queue.module';
import { ApifyModule } from './modules/apify/apify.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { LlmEvaluationModule } from './modules/llm-evaluation/llm-evaluation.module';

@Module({
  imports: [
    CqrsModule.forRoot(),
    DatabaseModule,
    QueueModule,
    ApifyModule,
    JobsModule,
    LlmEvaluationModule,
  ],
})
export class AppModule {}
