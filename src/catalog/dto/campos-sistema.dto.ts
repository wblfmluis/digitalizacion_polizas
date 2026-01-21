import { createInsertSchema } from 'drizzle-zod';
import { cCamposSistema } from '../../db/schema';
import { z } from 'zod';

export const insertCamposSistemaSchema = createInsertSchema(cCamposSistema, {
  nombreComun: (s) => s.min(3).max(100),
  nombreBd: (s) => s.min(3).max(100),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

export type CreateCamposSistemaDto = z.infer<typeof insertCamposSistemaSchema>;

export const updateCamposSistemaSchema = insertCamposSistemaSchema.partial();
export type UpdateCamposSistemaDto = z.infer<typeof updateCamposSistemaSchema>;
