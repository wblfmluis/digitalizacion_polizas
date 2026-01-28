import {
  BadRequestException,
  Injectable,
  Inject,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../../drizzle/schema';
import {
  and,
  eq,
  like,
  gte,
  lte,
  inArray,
  sql,
  type SQL,
  desc,
  isNotNull,
  isNull,
} from 'drizzle-orm';
import { AppwriteService } from '../appwrite/appwrite.service';
import path from 'node:path';
import { normalizeToMySqlDate } from '../utils/date';

const mxn = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  currencyDisplay: 'symbol',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type PolizasStatsParams = {
  idmatriz?: string | number;
  idejercicio?: string | number;
  fechaFrom?: string; // acepta "YYYY-MM-DD" (o algo parseable)
  fechaTo?: string; // acepta "YYYY-MM-DD" (o algo parseable)
};

type PolizasStatsResult = {
  totalPolizas: number;
  conArchivo: number;
  sinArchivo: number;
  sumaCargos: number;
  sumaAbonos: number;
  sumaCargosFm: string;
  sumaAbonosFm: string;
};

@Injectable()
export class PoliciesService {
  private readonly logger = new Logger(PoliciesService.name);
  constructor(
    @Inject(DRIZZLE) private db: MySql2Database<typeof schema>,
    private readonly appwriteService: AppwriteService,
  ) {}

  async getPolicies(params: Record<string, any>, user: string) {
    const { idejercicio, idmatriz, archivo } = params;
    const { page, pageSize, offset } = normalizePagination(params);

    const conditions: SQL[] = [];
    conditions.push(eq(schema.poliza.status, 1));
    if (idejercicio) {
      conditions.push(eq(schema.poliza.idejercicio, Number(idejercicio)));
    }
    if (idmatriz) {
      conditions.push(eq(schema.poliza.idmatriz, Number(idmatriz)));
    }
    if (archivo) {
      if (parseInt(archivo) === 1) {
        conditions.push(isNotNull(schema.poliza.idarchivoMetadata));
      }
      if (parseInt(archivo) === 0) {
        conditions.push(isNull(schema.poliza.idarchivoMetadata));
      }
    }
    const where = conditions.length ? and(...conditions) : sql`true`;

    const [items, totalRow] = await Promise.all([
      this.db
        .select()
        .from(schema.poliza)
        .innerJoin(
          schema.cEjercicio,
          eq(schema.poliza.idejercicio, schema.cEjercicio.id),
        )
        .innerJoin(schema.matriz, eq(schema.poliza.idmatriz, schema.matriz.id))
        .where(where)
        .orderBy(desc(schema.poliza.id))
        .limit(pageSize)
        .offset(offset),

      this.db
        .select({ total: sql<number>`count(*)` })
        .from(schema.poliza)
        .where(where)
        .then((r) => r[0]),
    ]);
    const total = Number(totalRow?.total ?? 0);
    return {
      items,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async uploadPolicieFile(
    file: Express.Multer.File,
    user: string,
    jwt: string,
  ) {
    if (!file || !file?.buffer) {
      new Error('Archivo no encontrado');
    }
    const original_file_name = file.originalname;
    const { name, ext, base } = path.parse(original_file_name);
    const db_policie = await this.db
      .select()
      .from(schema.poliza)
      .where(eq(schema.poliza.nomenclatura, name));
    for (const db_policie_row of db_policie) {
      if (db_policie_row.idmatriz) {
        const matriz = await this.db
          .select()
          .from(schema.matriz)
          .where(eq(schema.matriz.id, db_policie_row.idmatriz))
          .limit(1);
        if (matriz.length !== 0) {
          const detalle_matriz = matriz[0];
          const bucketId = detalle_matriz.bucketId;
          if (bucketId) {
            const saveToAppwrite = await this.appwriteService.uploadFile(
              file.buffer,
              original_file_name,
              bucketId,
              file.mimetype,
            );
            const file_to_insert = {
              nombre: original_file_name,
              mimetype: file.mimetype,
              size: file.size,
              fileId: saveToAppwrite.$id,
            };
            const insert_file_metadata = await this.db
              .insert(schema.archivoMetadata)
              .values(file_to_insert);
            return {
              message: 'Archivo subido con éxito',
            };
          } else {
            throw new BadRequestException({
              message: 'No hay bucketId asignado a la matriz',
            });
          }
        } else {
          throw new NotFoundException({
            message: 'No se encontró el la matriz asociada',
          });
        }
      }
    }
  }

  async getPolizasStats(
    params: PolizasStatsParams,
  ): Promise<PolizasStatsResult> {
    const { idejercicio, idmatriz, fechaFrom, fechaTo } = params;

    const conditions: SQL[] = [];
    conditions.push(eq(schema.poliza.status, 1));

    if (
      idejercicio !== undefined &&
      idejercicio !== null &&
      idejercicio !== ''
    ) {
      conditions.push(eq(schema.poliza.idejercicio, Number(idejercicio)));
    }

    if (idmatriz !== undefined && idmatriz !== null && idmatriz !== '') {
      conditions.push(eq(schema.poliza.idmatriz, Number(idmatriz)));
    }

    const from = fechaFrom
      ? normalizeToMySqlDate(fechaFrom, {
          preferDayFirst: false,
          fieldName: 'fechaFrom',
        })
      : null;
    const to = fechaTo
      ? normalizeToMySqlDate(fechaTo, {
          preferDayFirst: false,
          fieldName: 'fechaTo',
        })
      : null;

    if (from && to && from > to) {
      throw new BadRequestException('fechaFrom no puede ser mayor que fechaTo');
    }

    if (from) conditions.push(gte(schema.poliza.fecha, from));
    if (to) conditions.push(lte(schema.poliza.fecha, to));

    const where = conditions.length ? and(...conditions) : sql`true`;

    const [row] = await this.db
      .select({
        totalPolizas: sql<number>`count(*)`,
        conArchivo: sql<number>`
          coalesce(sum(case when ${schema.poliza.idarchivoMetadata} is not null then 1 else 0 end), 0)
        `,
        sinArchivo: sql<number>`
          coalesce(sum(case when ${schema.poliza.idarchivoMetadata} is null then 1 else 0 end), 0)
        `,
        sumaCargos: sql<number>`coalesce(sum(${schema.poliza.cargo}), 0)`,
        sumaAbonos: sql<number>`coalesce(sum(${schema.poliza.abono}), 0)`,
      })
      .from(schema.poliza)
      .where(where);

    return {
      totalPolizas: Number(row?.totalPolizas ?? 0),
      conArchivo: Number(row?.conArchivo ?? 0),
      sinArchivo: Number(row?.sinArchivo ?? 0),
      sumaCargos: Number(row?.sumaCargos ?? 0),
      sumaAbonos: Number(row?.sumaAbonos ?? 0),
      sumaCargosFm: mxn.format(Number(row?.sumaCargos ?? 0)),
      sumaAbonosFm: mxn.format(Number(row?.sumaAbonos ?? 0)),
    };
  }
}

type Pagination = { page?: number; pageSize?: number };

function normalizePagination(p: Pagination) {
  const page = Math.max(1, Number(p.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(p.pageSize ?? 20))); // cap
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
}

function normalizeString(value: string): string {
  const lastDotIndex = value.lastIndexOf('.');
  const hasExtension = lastDotIndex > 0 && lastDotIndex < value.length - 1;
  const baseName = hasExtension ? value.slice(0, lastDotIndex) : value;
  const extension = hasExtension ? value.slice(lastDotIndex) : '';

  const normalizedBase = baseName
    .toLowerCase()
    .normalize('NFD') // separa letras y acentos
    .replace(/[\u0300-\u036f]/g, '') // elimina acentos
    .replace(/[^\w\s]/g, '') // elimina signos de puntuación
    .replace(/\s+/g, '_') // espacios -> _
    .replace(/_+/g, '_') // evita múltiples _
    .replace(/^_+|_+$/g, ''); // quita _ al inicio/fin

  return `${normalizedBase}${extension}`;
}
