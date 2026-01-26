import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../../drizzle/schema';
import { eq, sql } from 'drizzle-orm';
import { CreateEjercicioDto, UpdateEjercicioDto } from './dto/ejercicio.dto';
import {
  CreateTipoAccionDto,
  UpdateTipoAccionDto,
} from './dto/tipo-accion.dto';
import { CreateEntidadDto, UpdateEntidadDto } from './dto/entidad.dto';
import {
  CreateCamposSistemaDto,
  UpdateCamposSistemaDto,
} from './dto/campos-sistema.dto';

@Injectable()
export class CatalogService {
  constructor(@Inject(DRIZZLE) private db: MySql2Database<typeof schema>) {}

  // Listar todos los ejercicios
  async findAllEjercicios() {
    return this.db.select().from(schema.cEjercicio);
  }

  // Insertar un nuevo ejercicio
  async createEjercicio(data: CreateEjercicioDto, user: string) {
    data.createdBy = user;
    return this.db.insert(schema.cEjercicio).values(data);
  }

  // Actualizar un ejercicio por ID
  async updateEjercicio(id: number, data: UpdateEjercicioDto, user: string) {
    return this.db
      .update(schema.cEjercicio)
      .set({
        ...data,
        updatedAt: sql`(CURRENT_TIMESTAMP)`,
        updatedBy: user,
      })
      .where(eq(schema.cEjercicio.id, id));
  }

  async deleteEjercicio(id: number, user: string) {
    return this.db
      .update(schema.cEjercicio)
      .set({
        deletedAt: sql`(CURRENT_TIMESTAMP)`,
        deletedBy: user,
        status: 0,
      })
      .where(eq(schema.cEjercicio.id, id));
  }

  async findAllTipoAccion() {
    return this.db.select().from(schema.cTipoAccion);
  }

  async createTipoAccion(data: CreateTipoAccionDto, user: string) {
    return this.db
      .insert(schema.cTipoAccion)
      .values({ ...data, createdBy: user });
  }

  async updateTipoAccion(id: number, data: UpdateTipoAccionDto, user: string) {
    return this.db
      .update(schema.cTipoAccion)
      .set({
        ...data,
        updatedAt: sql`(CURRENT_TIMESTAMP)`,
        updatedBy: user,
      })
      .where(eq(schema.cTipoAccion.id, id));
  }

  async findAllEntidades() {
    return this.db.select().from(schema.entidad);
  }

  async createEntidad(data: CreateEntidadDto, user: string) {
    return this.db.insert(schema.entidad).values({
      ...data,
      createdBy: user,
    });
  }

  async updateEntidad(id: number, data: UpdateEntidadDto, user: string) {
    return this.db
      .update(schema.entidad)
      .set({
        ...data,
        updatedAt: sql`(CURRENT_TIMESTAMP)`,
        updatedBy: user,
      })
      .where(eq(schema.entidad.id, id));
  }

  async findAllCamposSistema() {
    return this.db.select().from(schema.cCamposSistema);
  }

  async createCampoSistema(data: CreateCamposSistemaDto, user: string) {
    return this.db.insert(schema.cCamposSistema).values({
      ...data,
      createdBy: user,
    });
  }

  async updateCampoSistema(
    id: number,
    data: UpdateCamposSistemaDto,
    user: string,
  ) {
    return this.db
      .update(schema.cCamposSistema)
      .set({
        ...data,
        updatedAt: sql`(CURRENT_TIMESTAMP)`,
        updatedBy: user,
      })
      .where(eq(schema.cCamposSistema.id, id));
  }
}
