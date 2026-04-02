import { Module, Global, Logger } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/mysql2';
import * as mysql from 'mysql2/promise';
import * as schema from '../db/schema';

export const DRIZZLE = 'DRIZZLE';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function withJitter(ms: number, jitterRatio = 0.2) {
  const jitter = ms * jitterRatio * (Math.random() * 2 - 1); // +/- jitterRatio
  return Math.max(0, Math.floor(ms + jitter));
}

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      useFactory: async () => {
        const logger = new Logger('Database');

        const connection = mysql.createPool({
          uri: process.env.DATABASE_URL,
          connectTimeout: 5_000, // timeout de conexión (ms)
          // opcional: puedes ajustar también:
          // waitForConnections: true,
          // connectionLimit: 10,
          // queueLimit: 0,
        });

        // Loguea errores del pool (cortes, problemas de red, etc.)
        (connection as any).on?.('error', (err: any) => {
          logger.error(`DB pool error: ${err?.code ?? 'UNKNOWN'}`, err?.stack);
        });

        // --- Reintentos en background (NO bloquea el arranque de la app) ---
        void (async () => {
          const maxRetries = Number(process.env.DB_CONNECT_MAX_RETRIES ?? 0); // 0 = infinito
          const baseDelayMs = Number(
            process.env.DB_CONNECT_RETRY_BASE_MS ?? 500,
          );
          const maxDelayMs = Number(
            process.env.DB_CONNECT_RETRY_MAX_MS ?? 10_000,
          );

          let attempt = 0;

          while (maxRetries === 0 || attempt < maxRetries) {
            attempt += 1;

            try {
              await connection.query('SELECT 1');
              logger.log(`DB connection OK (attempt ${attempt})`);
              return; // listo, dejamos de reintentar
            } catch (err: any) {
              const code = err?.code ?? 'UNKNOWN';
              const msg = err?.message ?? String(err);

              const exp = Math.min(
                maxDelayMs,
                baseDelayMs * Math.pow(2, Math.max(0, attempt - 1)),
              );
              const delayMs = withJitter(exp, 0.25);

              logger.warn(
                `DB not available (attempt ${attempt}): ${code} - ${msg}. Retrying in ${delayMs}ms`,
              );

              await sleep(delayMs);
            }
          }

          logger.error(
            `DB connection failed after ${maxRetries} attempts. App seguirá corriendo, pero las operaciones DB fallarán hasta que haya conexión.`,
          );
        })();
        // --- fin reintentos ---

        return drizzle(connection, { schema, mode: 'default' });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
