import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

export const APIFY_QUEUE = 'apify';

@Global()
@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        // ioredis accepts a connection URL directly
        url: process.env.REDIS_URL ?? 'redis://localhost:6379',
      },
    }),
    BullModule.registerQueue({ name: APIFY_QUEUE }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
