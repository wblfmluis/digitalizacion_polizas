import { relations } from 'drizzle-orm/relations';
import {
  entidad,
  configuracionLayout,
  cTipoAccion,
  logEventos,
  poliza,
  cEjercicio,
  matriz,
  archivoMetadata,
} from './schema';

export const configuracionLayoutRelations = relations(
  configuracionLayout,
  ({ one }) => ({
    entidad: one(entidad, {
      fields: [configuracionLayout.identidad],
      references: [entidad.id],
    }),
  }),
);

export const entidadRelations = relations(entidad, ({ many }) => ({
  configuracionLayouts: many(configuracionLayout),
  polizas: many(poliza),
}));

export const logEventosRelations = relations(logEventos, ({ one }) => ({
  cTipoAccion: one(cTipoAccion, {
    fields: [logEventos.idcTipoAccion],
    references: [cTipoAccion.id],
  }),
  poliza: one(poliza, {
    fields: [logEventos.idpoliza],
    references: [poliza.id],
  }),
}));

export const cTipoAccionRelations = relations(cTipoAccion, ({ many }) => ({
  logEventos: many(logEventos),
}));

export const polizaRelations = relations(poliza, ({ one, many }) => ({
  logEventos: many(logEventos),
  archivoMetadatum: one(archivoMetadata, {
    fields: [poliza.idarchivoMetadata],
    references: [archivoMetadata.id],
  }),
  cEjercicio: one(cEjercicio, {
    fields: [poliza.idejercicio],
    references: [cEjercicio.id],
  }),
  entidad: one(entidad, {
    fields: [poliza.identidad],
    references: [entidad.id],
  }),
}));

export const matrizRelations = relations(matriz, ({ one }) => ({
  cEjercicio: one(cEjercicio, {
    fields: [matriz.idejercicio],
    references: [cEjercicio.id],
  }),
}));

export const cEjercicioRelations = relations(cEjercicio, ({ many }) => ({
  matrizs: many(matriz),
  polizas: many(poliza),
}));

export const archivoMetadataRelations = relations(
  archivoMetadata,
  ({ many }) => ({
    polizas: many(poliza),
  }),
);
