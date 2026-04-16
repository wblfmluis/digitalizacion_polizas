import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { getPdfPageCountFromPath } from '../utils/pdfinfo.util';
import { DRIZZLE } from '../database/database.module';
import { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../../drizzle/schema';
import {
  and,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  like,
  lte,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { AppwriteService } from '../appwrite/appwrite.service';
import { EventosService } from '../eventos/eventos.service';
import path from 'node:path';
import { normalizeToMySqlDate } from '../utils/date';
import type { Response } from 'express';
import archiver from 'archiver';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as fs from 'node:fs';

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
    @InjectQueue('pdf-queue') private readonly pdfOptimizeQueue: Queue,
    @Inject(DRIZZLE) private db: MySql2Database<typeof schema>,
    private readonly appwriteService: AppwriteService,
    private readonly eventosService: EventosService,
  ) {}

  async getPolicies(params: Record<string, any>, user: string) {
    const { idejercicio, idmatriz, archivo, q, fechaInicio, fechaFin } = params;
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
    if (fechaInicio && fechaFin) {
      const dateCondition = and(
        gte(schema.poliza.fecha, fechaInicio),
        lte(schema.poliza.fecha, fechaFin),
      );

      if (dateCondition) {
        conditions.push(dateCondition);
      }
    }
    const qTrim = typeof q === 'string' ? q.trim() : '';
    if (qTrim.length > 0) {
      const pattern = `%${escapeLike(qTrim)}%`;

      const searchCondition = or(
        like(schema.poliza.numero, pattern),
        like(schema.poliza.tipo, pattern),
        like(schema.poliza.concepto, pattern),
        like(schema.poliza.descripcion, pattern),
        like(schema.poliza.cuentaContable, pattern),
        like(schema.poliza.referencia, pattern),
        like(schema.poliza.nomenclatura, pattern),
      );

      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }
    //Enviar parametros de busqueda
    const where = conditions.length ? and(...conditions) : sql`true`;

    const [items, totalRow, filePagesCount] = await Promise.all([
      this.db
        .select()
        .from(schema.poliza)
        .innerJoin(
          schema.cEjercicio,
          eq(schema.poliza.idejercicio, schema.cEjercicio.id),
        )
        .innerJoin(schema.matriz, eq(schema.poliza.idmatriz, schema.matriz.id))
        .leftJoin(
          schema.archivoMetadata,
          eq(schema.poliza.idarchivoMetadata, schema.archivoMetadata.id),
        )
        .where(where)
        .orderBy(
          sql`CASE WHEN ${schema.poliza.idarchivoMetadata} IS NOT NULL THEN 0 ELSE 1 END`,
          desc(schema.poliza.id),
        )
        .limit(pageSize)
        .offset(offset),

      this.db
        .select({ total: sql<number>`count(*)` })
        .from(schema.poliza)
        .where(where)
        .then((r) => r[0]),

      this.db
        .select()
        .from(schema.poliza)
        .leftJoin(
          schema.archivoMetadata,
          eq(schema.poliza.idarchivoMetadata, schema.archivoMetadata.id),
        )
        .where(where)
        .orderBy(
          sql`CASE WHEN ${schema.poliza.idarchivoMetadata} IS NOT NULL THEN 0 ELSE 1 END`,
          desc(schema.poliza.id),
        ),
    ]);
    const total = Number(totalRow?.total ?? 0);
    let totalPaginasArchivos = 0;
    for (const it of filePagesCount) {
      if (it?.archivo_metadata) {
        totalPaginasArchivos += it.archivo_metadata?.paginas ?? 0;
      }
    }
    const cleanedItems = items.map((it) => {
      const {
        createdAt,
        updatedAt,
        createdBy,
        updatedBy,
        deletedAt,
        deletedBy,
        ...polizaSinFechas
      } = it.poliza ?? {};
      return {
        ...it,
        poliza: polizaSinFechas,
      };
    });
    const cleanedEjercicio = cleanedItems.map((it) => {
      const {
        createdAt,
        updatedAt,
        createdBy,
        updatedBy,
        deletedAt,
        deletedBy,
        ...ejercicioSinFechas
      } = it.c_ejercicio ?? {};
      return {
        ...it,
        c_ejercicio: ejercicioSinFechas,
      };
    });
    const cleanedMatriz = cleanedEjercicio.map((it) => {
      const {
        createdAt,
        updatedAt,
        createdBy,
        updatedBy,
        deletedAt,
        deletedBy,
        ...matrizSinFechas
      } = it.matriz ?? {};
      return {
        ...it,
        matriz: matrizSinFechas,
      };
    });

    await this.eventosService.logEvent(
      {
        idcTipoAccion: 3,
        filtros: params,
        usuario: user,
      },
      user,
    );
    return {
      items: cleanedMatriz,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      paginasArchivos: {
        total: totalPaginasArchivos,
      },
    };
  }

  async uploadPolicieFile(
    file: Express.Multer.File,
    user: string,
    jwt: string,
  ) {
    if (!file || !file?.path) {
      throw new Error('Archivo no encontrado');
    }
    this.logger.debug(`Subiendo archivo de poliza: ${file.originalname}`);
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
            let saveToAppwrite: {
              $id: any;
              bucketId?: string;
              $createdAt?: string;
              $updatedAt?: string;
              $permissions?: string[];
              name?: string;
              signature?: string;
              mimeType?: string;
              sizeOriginal?: number;
              chunksTotal?: number;
              chunksUploaded?: number;
            };
            const stat = await fs.promises.stat(file.path);
            if (stat.size > 500 * 1024 * 1024) {
              saveToAppwrite =
                await this.appwriteService.uploadLargeFileFromPath(
                  bucketId,
                  file.path,
                  original_file_name,
                );
            } else {
              saveToAppwrite = await this.appwriteService.uploadFileFromPath(
                file.path,
                original_file_name,
                bucketId,
                file.mimetype,
              );
            }

            const TEMP_DIR = process.env.TEMP_DIR ?? '/app/temp';
            const filePath = path.join(TEMP_DIR, `${file.originalname}`);
            const optimizedFilePath = path.join(
              TEMP_DIR,
              `optimized-${file.originalname}`,
            );

            //await writeFile(filePath, file.buffer);
            const pages = await count_pdf_pages(file.path);
            const file_to_insert = {
              nombre: original_file_name,
              mimetype: file.mimetype,
              size: file.size,
              fileId: saveToAppwrite.$id,
              bucketId: bucketId,
              paginas: pages,
              fileState: 'UPLOADED',
            };
            const [insert_file_metadata, value] = await this.db
              .insert(schema.archivoMetadata)
              .values(file_to_insert);
            const inserted_object: Record<string, any> = insert_file_metadata;
            if (insert_file_metadata) {
              const inserted_id = inserted_object.insertId;
              if (inserted_id) {
                const [update_poliza, value] = await this.db
                  .update(schema.poliza)
                  .set({ idarchivoMetadata: inserted_id })
                  .where(eq(schema.poliza.id, db_policie_row.id));
              }
              await this.eventosService.logEvent(
                {
                  idcTipoAccion: 4,
                  idpoliza: db_policie_row.id,
                  usuario: user,
                },
                user,
              );
              const policyId = db_policie_row.id;
              const archivoMetadataId = Number(inserted_id);
              const originalFileId = file_to_insert.fileId;
              const bucketId = file_to_insert.bucketId;
              await this.pdfOptimizeQueue.add(
                'optimize',
                {
                  fileId: saveToAppwrite.$id,
                  fileName: file.originalname,
                  inputPath: `./temp/${file.originalname}`,
                  outputPath: `./temp/optimized-${file.originalname}`,
                },
                {
                  attempts: 3,
                  backoff: { type: 'exponential', delay: 5_000 },
                  removeOnComplete: 1000,
                  removeOnFail: 5000,
                  jobId: `pdf-optimize-${archivoMetadataId}`,
                },
              );
            }
          } else {
            fs.unlinkSync(process.env.TEMP_DIR + '/' + file.originalname);
            throw new BadRequestException({
              message: 'No hay bucketId asignado a la matriz',
            });
          }
        } else {
          fs.unlinkSync(process.env.TEMP_DIR + '/' + file.originalname);
          throw new NotFoundException({
            message: 'No se encontró el la matriz asociada',
          });
        }
      }
    }
    if (db_policie.length !== 0) {
      return { message: 'Archivo cargado con éxito' };
    } else {
      throw new BadRequestException({
        message:
          'No se encontro una poliza compatible con el nombre del archivo',
      });
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

  async policieDetail(id: number, user: string) {
    const [row] = await this.db
      .select()
      .from(schema.poliza)
      .innerJoin(
        schema.cEjercicio,
        eq(schema.poliza.idejercicio, schema.cEjercicio.id),
      )
      .innerJoin(schema.matriz, eq(schema.poliza.idmatriz, schema.matriz.id))
      .leftJoin(
        schema.archivoMetadata,
        eq(schema.poliza.idarchivoMetadata, schema.archivoMetadata.id),
      )
      .where(eq(schema.poliza.id, id));
    await this.eventosService.logEvent(
      {
        idcTipoAccion: 1,
        idpoliza: id,
        usuario: user,
      },
      user,
    );
    return row;
  }

  async streamZipFromAppwriteFileIds(
    fileIds: string[],
    res: Response,
    user: string,
  ) {
    const uniqueFileIds = Array.from(
      new Set(fileIds.map((x) => String(x).trim()).filter(Boolean)),
    );

    if (uniqueFileIds.length === 0) {
      throw new BadRequestException('No se recibieron fileIds válidos');
    }

    // 1) Buscar metadata en BD (para bucketId/nombre)
    const metas = await this.db
      .select({
        fileId: schema.archivoMetadata.fileId,
        bucketId: schema.archivoMetadata.bucketId,
        nombre: schema.archivoMetadata.nombre,
        mimetype: schema.archivoMetadata.mimetype,
      })
      .from(schema.archivoMetadata)
      .where(inArray(schema.archivoMetadata.fileId, uniqueFileIds));

    if (!metas.length) {
      throw new NotFoundException(
        'No se encontraron archivos para esos fileIds',
      );
    }

    // 2) Preparar headers de descarga
    const zipName = `archivos_${new Date().toISOString().slice(0, 10)}.zip`;
    res.status(200);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);

    // 3) Crear zip y streamearlo al response
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('warning', (err) => {
      // Warnings no siempre rompen
      this.logger.warn(`archiver warning: ${err?.message ?? String(err)}`);
    });

    archive.on('error', (err) => {
      this.logger.error('archiver error', err.stack);
      // Si truena el zip, cerramos la respuesta
      try {
        res.status(500).end();
      } catch {
        // ignore
      }
    });

    archive.pipe(res);

    // Para evitar nombres duplicados dentro del ZIP
    const usedNames = new Map<string, number>();

    // 4) Descargar de Appwrite y agregar al ZIP
    for (const meta of metas) {
      try {
        const bucketId = meta.bucketId;
        const fileId = meta.fileId;

        if (!bucketId || !fileId) continue;

        const downloaded = await this.appwriteService.getFileForDownload(
          bucketId,
          fileId,
          user,
        );

        const baseName =
          meta.nombre && String(meta.nombre).trim()
            ? String(meta.nombre).trim()
            : fileId;
        const safeName = makeUniqueZipName(baseName, usedNames);

        // Agrega como Buffer
        archive.append(downloaded.buffer, {
          name: safeName,
        });
      } catch (e: any) {
        // Si un archivo falla, puedes:
        // - Omitirlo y continuar (lo hago aquí)
        // - O abortar todo (depende del negocio)
        this.logger.warn(
          `No se pudo agregar un archivo al ZIP: ${e?.message ?? String(e)}`,
        );
        continue;
      }
    }

    // 5) Finalizar zip
    await archive.finalize();
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

function escapeLike(input: string) {
  // Escapa caracteres especiales de LIKE: \ % _
  // MySQL: el caracter de escape por defecto puede variar; este enfoque suele ser suficiente
  // para evitar que el usuario inyecte comodines involuntarios.
  return input.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

function makeUniqueZipName(original: string, used: Map<string, number>) {
  const parsed = path.parse(original);
  const base = parsed.name || original;
  const ext = parsed.ext || '';

  const current = used.get(original) ?? 0;
  if (current === 0) {
    used.set(original, 1);
    return original;
  }

  const next = current + 1;
  used.set(original, next);
  return `${base} (${next})${ext}`;
}

async function count_pdf_pages(pdf_path: string) {
  try {
    const pdfinfo = await getPdfPageCountFromPath(pdf_path);
    return pdfinfo.pages;
  } catch (e) {
    console.error('Error al obtener el número de páginas del PDF:', e);
    return 0;
  }
}
