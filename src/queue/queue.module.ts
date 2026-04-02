import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT ?? 6379),
        ...(process.env.REDIS_USERNAME?.trim()
          ? { username: process.env.REDIS_USERNAME }
          : {}),
        ...(process.env.REDIS_PASSWORD?.trim()
          ? { password: process.env.REDIS_PASSWORD }
          : {}),
      },
    }),
    BullModule.registerQueue({
      name: 'pdf-optimize',
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
