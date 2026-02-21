import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT ?? 6379),
        // username/password si aplica:
        // username: process.env.REDIS_USER,
        // password: process.env.REDIS_PASSWORD,
      },
    }),
    BullModule.registerQueue({
      name: 'pdf-optimize',
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
