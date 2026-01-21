import { createInsertSchema } from 'drizzle-zod';
import { cTipoAccion } from '../../db/schema';
import { z } from 'zod';

export const insertTipoAccionSchema = createInsertSchema(cTipoAccion, {
  // 's' ya es el esquema de Zod para el campo 'accion'
  accion: (s) => s.min(3).max(100),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export type CreateTipoAccionDto = z.infer<typeof insertTipoAccionSchema>;

export const updateTipoAccionSchema = insertTipoAccionSchema.partial();
export type UpdateTipoAccionDto = z.infer<typeof updateTipoAccionSchema>;
