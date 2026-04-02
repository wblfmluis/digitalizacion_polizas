import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker/worker.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(WorkerModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  const logger = new Logger('WorkerBootstrap');
  logger.log('Worker iniciado y escuchando cola(s) BullMQ (pdf-optimize)');

  // Mantener vivo el proceso
  const shutdown = async (signal: string) => {
    logger.warn(`Recibido ${signal}. Cerrando worker...`);
    await appContext.close();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

void bootstrap();
