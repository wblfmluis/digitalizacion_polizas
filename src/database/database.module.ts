import { Module, Global, Logger } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import * as mysql from 'mysql2/promise';
import * as path from 'path';
import * as schema from '../db/schema';

export const DRIZZLE = 'DRIZZLE';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function withJitter(ms: number, jitterRatio = 0.2) {
  const jitter = ms * jitterRatio * (Math.random() * 2 - 1);
  return Math.max(0, Math.floor(ms + jitter));
}

async function ensureDatabase(logger: Logger) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logger.error('DATABASE_URL no definida');
    return;
  }

  const url = new URL(databaseUrl);
  const dbName = url.pathname.slice(1);

  const maxRetries = Number(process.env.DB_CONNECT_MAX_RETRIES ?? 0);
  const baseDelayMs = Number(process.env.DB_CONNECT_RETRY_BASE_MS ?? 500);
  const maxDelayMs = Number(process.env.DB_CONNECT_RETRY_MAX_MS ?? 10_000);
  let attempt = 0;

  while (maxRetries === 0 || attempt < maxRetries) {
    attempt += 1;
    let conn: mysql.Connection | undefined;
    try {
      conn = await mysql.createConnection({
        host: url.hostname,
        port: url.port ? Number(url.port) : 3306,
        user: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
        connectTimeout: 5_000,
      });
      await conn.execute(
        `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      );
      logger.log(`Base de datos "${dbName}" lista (attempt ${attempt})`);
      return;
    } catch (err: any) {
      const code = err?.code ?? 'UNKNOWN';
      const msg = err?.message ?? String(err);
      const exp = Math.min(
        maxDelayMs,
        baseDelayMs * Math.pow(2, Math.max(0, attempt - 1)),
      );
      const delayMs = withJitter(exp, 0.25);
      logger.warn(
        `MySQL no disponible (attempt ${attempt}): ${code} - ${msg}. Reintentando en ${delayMs}ms`,
      );
      await sleep(delayMs);
    } finally {
      await conn?.end().catch(() => undefined);
    }
  }

  logger.error(
    `No se pudo crear la base de datos después de ${maxRetries} intentos.`,
  );
}

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      useFactory: async () => {
        const logger = new Logger('Database');

        await ensureDatabase(logger);

        const connection = mysql.createPool({
          uri: process.env.DATABASE_URL,
          connectTimeout: 5_000,
        });

        (connection as any).on?.('error', (err: any) => {
          logger.error(`DB pool error: ${err?.code ?? 'UNKNOWN'}`, err?.stack);
        });

        await connection.query('SELECT 1');
        logger.log('DB connection OK');

        const db = drizzle(connection, { schema, mode: 'default' });

        try {
          await migrate(db, {
            migrationsFolder: path.join(process.cwd(), 'drizzle'),
          });
          logger.log('Migraciones aplicadas correctamente');
        } catch (err: any) {
          logger.error(`Error al aplicar migraciones: ${err?.message}`, err?.stack);
        }

        return db;
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
