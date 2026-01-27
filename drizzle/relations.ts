import { relations } from "drizzle-orm/relations";
import { cTipoAccion, logEventos, poliza, cEjercicio, matriz, archivoMetadata, entidad } from "./schema";

export const logEventosRelations = relations(logEventos, ({one}) => ({
	cTipoAccion: one(cTipoAccion, {
		fields: [logEventos.idcTipoAccion],
		references: [cTipoAccion.id]
	}),
	poliza: one(poliza, {
		fields: [logEventos.idpoliza],
		references: [poliza.id]
	}),
}));

export const cTipoAccionRelations = relations(cTipoAccion, ({many}) => ({
	logEventos: many(logEventos),
}));

export const polizaRelations = relations(poliza, ({one, many}) => ({
	logEventos: many(logEventos),
	archivoMetadatum: one(archivoMetadata, {
		fields: [poliza.idarchivoMetadata],
		references: [archivoMetadata.id]
	}),
	cEjercicio: one(cEjercicio, {
		fields: [poliza.idejercicio],
		references: [cEjercicio.id]
	}),
	entidad: one(entidad, {
		fields: [poliza.identidad],
		references: [entidad.id]
	}),
	matriz: one(matriz, {
		fields: [poliza.idmatriz],
		references: [matriz.id]
	}),
}));

export const matrizRelations = relations(matriz, ({one, many}) => ({
	cEjercicio: one(cEjercicio, {
		fields: [matriz.idejercicio],
		references: [cEjercicio.id]
	}),
	polizas: many(poliza),
}));

export const cEjercicioRelations = relations(cEjercicio, ({many}) => ({
	matrizs: many(matriz),
	polizas: many(poliza),
}));

export const archivoMetadataRelations = relations(archivoMetadata, ({many}) => ({
	polizas: many(poliza),
}));

export const entidadRelations = relations(entidad, ({many}) => ({
	polizas: many(poliza),
}));