import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  const rawOrigins =
    process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://localhost:8080';
  //const rawOrigins = '*';

  const allowedOrigins = rawOrigins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  console.log('🔒 CORS allowed origins:', allowedOrigins);

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (arg0: Error | null, arg1: boolean) => any,
    ) => {
      // Log para debugging
      console.log('📍 Request from origin:', origin);

      // Permitir peticiones sin origin (ej: herramientas como curl, postman, o same-origin)
      if (!origin) {
        return callback(null, true);
      }

      // Verificar si el origin está en la lista permitida
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Rechazar origen no permitido
      console.warn('❌ CORS blocked origin:', origin);
      return callback(new Error(`CORS: Origin no permitido: ${origin}`), false);
    },

    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'access-token',
    ],
    exposedHeaders: ['Set-Cookie'],
    optionsSuccessStatus: 204,
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
