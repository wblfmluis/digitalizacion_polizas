import { createInsertSchema } from 'drizzle-zod';
import { cEjercicio } from '../../db/schema';
import { z } from 'zod';

// Generamos el esquema base de inserción a partir de la tabla
export const insertEjercicioSchema = createInsertSchema(cEjercicio, {
  // Aquí podemos añadir validaciones extra que no están en la DB
  ejercicio: (s) => s.min(2000).max(2100),
}).omit({
  // Omitimos campos que el usuario no debería enviar (se generan automáticamente)
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});

// Este es el tipo que usaremos en TypeScript
export type CreateEjercicioDto = z.infer<typeof insertEjercicioSchema>;

// Esquema para actualización (hace todos los campos opcionales)
export const updateEjercicioSchema = insertEjercicioSchema.partial();
export type UpdateEjercicioDto = z.infer<typeof updateEjercicioSchema>;
