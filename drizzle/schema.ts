import {
  mysqlTable,
  mysqlSchema,
  AnyMySqlColumn,
  primaryKey,
  int,
  varchar,
  year,
  foreignKey,
  json,
  tinyint,
  date,
  text,
  decimal,
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

export const archivoMetadata = mysqlTable(
  'archivo_metadata',
  {
    id: int().autoincrement().notNull(),
    nombre: varchar({ length: 150 }),
    mimetype: varchar({ length: 50 }),
    size: int(),
    paginas: int(),
  },
  (table) => [primaryKey({ columns: [table.id], name: 'archivo_metadata_id' })],
);

export const cCamposSistema = mysqlTable(
  'c_campos_sistema',
  {
    id: int().autoincrement().notNull(),
    nombreComun: varchar('nombre_comun', { length: 100 }),
    nombreBd: varchar('nombre_bd', { length: 100 }),
  },
  (table) => [primaryKey({ columns: [table.id], name: 'c_campos_sistema_id' })],
);

export const cEjercicio = mysqlTable(
  'c_ejercicio',
  {
    id: int().autoincrement().notNull(),
    ejercicio: year(),
  },
  (table) => [primaryKey({ columns: [table.id], name: 'c_ejercicio_id' })],
);

export const cTipoAccion = mysqlTable(
  'c_tipo_accion',
  {
    id: int().autoincrement().notNull(),
    accion: varchar({ length: 100 }),
  },
  (table) => [primaryKey({ columns: [table.id], name: 'c_tipo_accion_id' })],
);
export const configuracionLayout = mysqlTable(
  'configuracion_layout',
  {
    id: int().autoincrement().notNull(),
    identidad: int().references(() => entidad.id),
    configuracion: json(),
    activo: tinyint(),
  },
  (table) => [
    primaryKey({ columns: [table.id], name: 'configuracion_layout_id' }),
  ],
);

export const entidad = mysqlTable(
  'entidad',
  {
    id: int().autoincrement().notNull(),
    nombre: varchar({ length: 150 }),
    rfc: varchar({ length: 15 }),
  },
  (table) => [primaryKey({ columns: [table.id], name: 'entidad_id' })],
);

export const logEventos = mysqlTable(
  'log_eventos',
  {
    id: int().autoincrement().notNull(),
    idcTipoAccion: int('idc_tipo_accion').references(() => cTipoAccion.id),
    idpoliza: int().references(() => poliza.id),
    usuario: varchar({ length: 150 }),
  },
  (table) => [primaryKey({ columns: [table.id], name: 'log_eventos_id' })],
);

export const matriz = mysqlTable(
  'matriz',
  {
    id: int().autoincrement().notNull(),
    idejercicio: int().references(() => cEjercicio.id),
    configuracionCampos: json('configuracion_campos'),
  },
  (table) => [primaryKey({ columns: [table.id], name: 'matriz_id' })],
);

export const poliza = mysqlTable(
  'poliza',
  {
    id: int().autoincrement().notNull(),
    idejercicio: int().references(() => cEjercicio.id),
    identidad: int().references(() => entidad.id),
    idproveedor: int(),
    idarchivoMetadata: int('idarchivo_metadata').references(
      () => archivoMetadata.id,
    ),
    uuid: varchar({ length: 36 }),
    numero: varchar({ length: 150 }),
    tipo: varchar({ length: 2 }),
    // you can use { mode: 'date' }, if you want to have Date as type for this column
    fecha: date({ mode: 'string' }),
    concepto: varchar({ length: 500 }),
    descripcion: text(),
    cuentaContable: varchar('cuenta_contable', { length: 100 }),
    referencia: varchar({ length: 100 }),
    cargo: decimal({ precision: 10, scale: 2 }),
    abono: decimal({ precision: 10, scale: 2 }),
  },
  (table) => [primaryKey({ columns: [table.id], name: 'poliza_id' })],
);
