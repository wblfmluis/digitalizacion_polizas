import { Logger, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import Redis from 'ioredis';

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: async () => {
        const logger = new Logger('Redis');
        const host = process.env.REDIS_HOST ?? 'localhost';
        const port = Number(process.env.REDIS_PORT ?? 6379);
        const password = process.env.REDIS_PASSWORD;

        try {
          const redis = new Redis({
            host,
            port,
            password,
            connectTimeout: 5_000,
            lazyConnect: true,
          });
          await redis.connect();
          const pong = await redis.ping();
          logger.log(`Redis/Valkey connection OK — ${host}:${port} → ${pong}`);
          await redis.quit();
        } catch (err: any) {
          logger.error(
            `Redis/Valkey no disponible (${host}:${port}): ${err?.message}`,
          );
        }

        return {
          connection: { host, port, password, maxRetriesPerRequest: null },
        };
      },
    }),
    BullModule.registerQueue({
      name: 'pdf-queue',
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
