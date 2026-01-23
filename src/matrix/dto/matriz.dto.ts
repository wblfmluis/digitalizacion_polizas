import { createInsertSchema } from 'drizzle-zod';
import { matriz } from '../../db/schema';
import { z } from 'zod';

export const insertMatrizSchema = createInsertSchema(matriz, {
  idejercicio: (s) => s.int(),
  nombre: (s) => s.min(1).max(100),
  bucketId: (s) => s.min(1).max(100),
  confDbToXls: () => z.unknown(),
  confXlsToDb: () => z.unknown(),
  fileId: (s) => s.min(1).max(100),
}).omit({
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export type CreateMatrizDto = z.infer<typeof insertMatrizSchema>;

export const updateMatrizSchema = insertMatrizSchema.partial();
export type UpdateMatrizDto = z.infer<typeof updateMatrizSchema>;
