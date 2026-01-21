import { createInsertSchema } from 'drizzle-zod';
import { entidad } from '../../db/schema';
import { z } from 'zod';

export const insertEntidadSchema = createInsertSchema(entidad, {
  nombre: (s) => s.min(3).max(150),
  rfc: (s) => s.min(12).max(13),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export type CreateEntidadDto = z.infer<typeof insertEntidadSchema>;

export const updateEntidadSchema = insertEntidadSchema.partial();
export type UpdateEntidadDto = z.infer<typeof updateEntidadSchema>;
