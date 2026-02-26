import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DatabaseModule } from './database/database.module';
import { QueueModule } from './queue/queue.module';
import { ApifyModule } from './modules/apify/apify.module';
import { JobsModule } from './modules/jobs/jobs.module';

@Module({
  imports: [CqrsModule.forRoot(), DatabaseModule, QueueModule, ApifyModule, JobsModule],
})
export class AppModule {}
