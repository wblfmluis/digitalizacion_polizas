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
import { and, eq, sql } from 'drizzle-orm';
import * as xlsx from 'xlsx';
import { AppwriteService } from '../appwrite/appwrite.service';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { dateForName, normalizeToMySqlDate } from '../utils/date';

@Injectable()
export class MatrixService {
  private readonly logger = new Logger(MatrixService.name);
  constructor(
    @Inject(DRIZZLE) private db: MySql2Database<typeof schema>,
    private readonly appwriteService: AppwriteService,
  ) {}
  getExcelHeadersFromBuffer(buffer: Buffer): string[] {
    if (!buffer?.length) {
      throw new BadRequestException('Archivo vacío o no recibido.');
    }

    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames?.[0];

    if (!firstSheetName) {
      throw new BadRequestException('El archivo no contiene hojas.');
    }

    const sheet = workbook.Sheets[firstSheetName];
    if (!sheet || !sheet['!ref']) {
      throw new BadRequestException('La hoja está vacía.');
    }

    const range = xlsx.utils.decode_range(sheet['!ref']);

    // Tomamos la primera fila (range.s.r) como encabezados
    const headerRowIndex = range.s.r;

    const headers: string[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellAddress = xlsx.utils.encode_cell({ r: headerRowIndex, c });
      const cell = sheet[cellAddress];

      const raw = cell?.v;
      const header =
        raw === undefined || raw === null ? '' : String(raw).trim();

      if (header) headers.push(header);
    }

    // Opcional: eliminar duplicados manteniendo orden
    const uniqueHeaders = Array.from(new Set(headers));

    if (uniqueHeaders.length === 0) {
      throw new BadRequestException(
        'No se encontraron encabezados en la primera fila.',
      );
    }

    return uniqueHeaders;
  }

  async getExcelHeadersFromAppwrite(
    bucketId: string,
    fileId: string,
  ): Promise<string[]> {
    try {
      const appwriteFile = await this.appwriteService.getFileForDownload(
        bucketId,
        fileId,
      );
      if (!appwriteFile.buffer?.length) {
        throw new BadRequestException('Archivo vacío o no recibido.');
      }
      const buffer = appwriteFile.buffer;
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames?.[0];

      if (!firstSheetName) {
        throw new BadRequestException('El archivo no contiene hojas.');
      }

      const sheet = workbook.Sheets[firstSheetName];
      if (!sheet || !sheet['!ref']) {
        throw new BadRequestException('La hoja está vacía.');
      }

      const range = xlsx.utils.decode_range(sheet['!ref']);

      // Tomamos la primera fila (range.s.r) como encabezados
      const headerRowIndex = range.s.r;

      const headers: string[] = [];
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellAddress = xlsx.utils.encode_cell({ r: headerRowIndex, c });
        const cell = sheet[cellAddress];

        const raw = cell?.v;
        const header =
          raw === undefined || raw === null ? '' : String(raw).trim();

        if (header) headers.push(header);
      }

      // Opcional: eliminar duplicados manteniendo orden
      const uniqueHeaders = Array.from(new Set(headers));

      if (uniqueHeaders.length === 0) {
        throw new BadRequestException(
          'No se encontraron encabezados en la primera fila.',
        );
      }
      return uniqueHeaders;
    } catch (e) {
      this.logger.error('Error al obtener encabezados del archivo Excel', e);
      throw e;
    }
  }

  async createMatrix(
    data: Record<string, any>,
    file: Express.Multer.File,
    user: string,
    jwt: string,
  ) {
    try {
      if (!file || !file?.buffer) {
        new Error('Archivo no encontrado');
      }
      const matrix_name = normalizeString(file.originalname);
      const bucketId = await this.appwriteService.createBucketId(matrix_name);
      const saveToAppwrite = await this.appwriteService.uploadFile(
        file.buffer,
        matrix_name,
        bucketId,
        file.mimetype,
      );
      if (saveToAppwrite?.$id) {
        const [insert_matrix, value] = await this.db
          .insert(schema.matriz)
          .values({
            ...data,
            bucketId: bucketId,
            fileId: saveToAppwrite.$id,
            createdBy: user,
          });
        const inserted_object: Record<string, any> = insert_matrix;
        if (!insert_matrix) {
          const inserted_id = inserted_object.insertId;
          if (!inserted_id) {
            throw new Error('No se pudo obtener el id de la matriz insertada');
          }
        }

        const inserted_id = inserted_object.insertId;

        const [matrizInsertada] = await this.db
          .select()
          .from(schema.matriz)
          .where(eq(schema.matriz.id, inserted_id));

        const excel_headers = await this.getExcelHeadersFromAppwrite(
          bucketId,
          saveToAppwrite.$id,
        );
        return {
          matriz: matrizInsertada,
          excel_headers: excel_headers,
        };
      }
    } catch (e) {
      this.logger.error(
        e instanceof Error ? e.message : 'Unknown error occurred',
      );
      return { result: false, message: 'Error getting obra' };
    }
  }

  async updateMatrix(id: number, data: Record<string, any>, user: string) {
    try {
      return this.db
        .update(schema.matriz)
        .set({
          ...data,
          updatedAt: sql`(CURRENT_TIMESTAMP)`,
          updatedBy: user,
        })
        .where(eq(schema.matriz.id, id));
    } catch (e) {
      this.logger.error(
        e instanceof Error ? e.message : 'Unknown error occurred',
      );
      return { result: false, message: 'Error getting obra' };
    }
  }

  async getMatrix(user: string) {
    return this.db
      .select()
      .from(schema.matriz)
      .innerJoin(
        schema.cEjercicio,
        eq(schema.matriz.idejercicio, schema.cEjercicio.id),
      )
      .where(
        and(eq(schema.matriz.createdBy, user), eq(schema.matriz.status, 1)),
      );
  }

  async getMatrixById(id: number) {
    const rows = await this.db
      .select()
      .from(schema.matriz)
      .innerJoin(
        schema.cEjercicio,
        eq(schema.matriz.idejercicio, schema.cEjercicio.id),
      )
      .where(eq(schema.matriz.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) {
      throw new NotFoundException(`Matriz ${id} no encontrada`);
    }
    const { matriz, c_ejercicio } = row;
    if (!matriz.bucketId || !matriz.fileId) {
      throw new BadRequestException(
        `La matriz ${id} no tiene bucketId asignado`,
      );
    }
    const excel_headers = await this.getExcelHeadersFromAppwrite(
      matriz.bucketId,
      matriz.fileId,
    );
    const result: Record<string, any> = matriz;
    result.c_ejercicio = c_ejercicio;
    result.excel_headers = excel_headers;
    return result;
  }

  async procesar_polizas_xlsx(idmatriz: number) {
    try {
      const matriz = await this.getMatrixById(idmatriz);
      const campos_sistema = await this.db
        .select({
          id: schema.cCamposSistema.id,
          nombreBd: schema.cCamposSistema.nombreBd,
        })
        .from(schema.cCamposSistema);
      const maped_header = createDbXlsxFields(
        campos_sistema,
        matriz.confDbToXls,
      );
      const xlsx_buffer = await this.appwriteService.getFileForDownload(
        matriz.bucketId,
        matriz.fileId,
      );
      this.logger.log('Generando mapeo de campos');
      return sheetRowsFromBuffer(xlsx_buffer.buffer);
    } catch (e) {
      this.logger.error('Error al procesar las pólizas: ' + e.message);
    }
  }

  async procesar_polizas(idmatriz: number) {
    const validar_polizas = await this.db
      .select()
      .from(schema.poliza)
      .where(
        and(eq(schema.poliza.idmatriz, idmatriz), eq(schema.poliza.status, 1)),
      )
      .limit(1);
    if (validar_polizas.length !== 0) {
      throw new BadRequestException(`Matriz ${idmatriz} ya procesada`);
    }
    // 1) Cargar matriz
    const [matriz] = await this.db
      .select()
      .from(schema.matriz)
      .where(eq(schema.matriz.id, idmatriz))
      .limit(1);

    if (!matriz)
      throw new NotFoundException(`Matriz ${idmatriz} no encontrada`);
    if (!matriz.bucketId || !matriz.fileId) {
      throw new BadRequestException(
        `La matriz ${idmatriz} no tiene archivo asociado`,
      );
    }
    if (!matriz.confDbToXls) {
      throw new BadRequestException(
        `La matriz ${idmatriz} no tiene confDbToXls`,
      );
    }
    // 2) Parsear config (si viene string desde BD)
    const confRaw =
      typeof matriz.confDbToXls === 'string'
        ? JSON.parse(matriz.confDbToXls)
        : matriz.confDbToXls;

    const confDbToXls = confDbToXlsSchema.parse(confRaw);
    // 3) Descargar excel
    const file = await this.appwriteService.getFileForDownload(
      matriz.bucketId,
      matriz.fileId,
    );
    // 4) Leer filas
    const workbook = xlsx.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames?.[0];
    if (!sheetName) throw new BadRequestException('El Excel no tiene hojas');

    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json<Record<string, any>>(sheet, {
      defval: null,
      raw: false,
    });

    if (rows.length === 0) {
      return { inserted: 0, skipped: 0, errors: [] as any[] };
    }
    // 5) Mapear a polizas
    type PolizaInsert = typeof schema.poliza.$inferInsert;
    const polizas: PolizaInsert[] = [];
    const errors: Array<{ rowIndex: number; reason: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const identificador = row[confDbToXls['10']] ?? '';
      let nomenclatura = '';
      if (row[confDbToXls['3']] && row[confDbToXls['1']]) {
        if (!identificador) {
          nomenclatura =
            String(row[confDbToXls['1']] ?? '').trim() +
            '_' +
            dateForName(
              normalizeToMySqlDate(row[confDbToXls['3']], {
                preferDayFirst: false,
                fieldName: 'fecha',
              }),
            );
        } else {
          nomenclatura =
            String(row[confDbToXls['1']] ?? '').trim() +
            '_' +
            dateForName(
              normalizeToMySqlDate(row[confDbToXls['3']], {
                preferDayFirst: false,
                fieldName: 'fecha',
              }),
            ) +
            '_' +
            identificador;
        }
      }
      try {
        const mapped: PolizaInsert = {
          // Ajusta estos campos a tu tabla real `poliza`
          numero: String(row[confDbToXls['1']] ?? '').trim(),
          tipo: String(row[confDbToXls['2']] ?? '').trim(),
          fecha: normalizeToMySqlDate(row[confDbToXls['3']], {
            preferDayFirst: false,
            fieldName: 'fecha',
          }),
          concepto: String(row[confDbToXls['4']] ?? '').trim(),
          descripcion: String(row[confDbToXls['5']] ?? '').trim(),
          cuentaContable: String(row[confDbToXls['6']] ?? '').trim(),
          referencia: String(row[confDbToXls['7']] ?? '').trim(),
          cargo: toMySqlDecimal2(row[confDbToXls['8']]),
          abono: toMySqlDecimal2(row[confDbToXls['9']]),
          idmatriz: idmatriz,
          idejercicio: matriz.idejercicio,
          uuid: uuidv4(),
          nomenclatura: nomenclatura,
        };

        // validación mínima ejemplo:
        if (!mapped.numero) throw new Error('Campo número poliza vacío');
        if (!mapped.cuentaContable)
          throw new Error('Campo cuentaContable vacío');

        polizas.push(mapped);
      } catch (e: any) {
        const excelRowNumber = i + 2; // 1=headers, datos empiezan en 2
        this.logger.warn(
          `Fila Excel inválida (fila ${excelRowNumber}): ${e?.message ?? 'Error'}`,
        );

        // Log detallado (útil en debug)
        this.logger.debug({
          excelRowNumber,
          rawRow: row,
          cargoRaw: row[confDbToXls['8']],
          abonoRaw: row[confDbToXls['9']],
        });

        errors.push({
          rowIndex: excelRowNumber,
          reason: e?.message ?? 'Error mapeando fila',
        });
      }
    }
    // 6) Insertar (batch)
    const BATCH_SIZE = 500;

    await this.db.transaction(async (tx) => {
      for (const batch of chunk(polizas, BATCH_SIZE)) {
        try {
          await tx.insert(schema.poliza).values(batch);
        } catch (e: any) {
          this.logger.error(
            `Falló insert batch (size=${batch.length}). Buscando fila exacta...`,
            e instanceof Error ? e.stack : undefined,
          );

          // Fallback: insertar uno por uno para detectar el registro problemático
          for (let j = 0; j < batch.length; j++) {
            const item = batch[j];
            try {
              await tx.insert(schema.poliza).values(item);
            } catch (e2: any) {
              this.logger.error(
                `Falló insert registro individual. Registro: ${JSON.stringify(item)}`,
              );
              throw e2; // re-lanza para abortar transacción
            }
          }

          throw e; // si por alguna razón no falló en individual, re-lanza el original
        }
      }
    });

    return {
      inserted: polizas.length,
      skipped: errors.length,
      errors,
    };
  }
}

const confDbToXlsSchema = z.record(z.string(), z.string().min(1));

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
type ConfDbToXls = Record<string, string>; // destino -> headerExcel

function mapExcelRowToPoliza(row: Record<string, any>, conf: ConfDbToXls) {
  const get = (destField: string) => {
    const header = conf[destField];
    if (!header) return null;
    return row[header];
  };

  return {
    poliza: String(get('poliza') ?? '').trim(),
    tipo: String(get('tipo') ?? '').trim(),
    fecha: get('fecha'), // la normalizas abajo
    concepto: String(get('concepto') ?? '').trim(),
    descripcion: String(get('descripcion') ?? '').trim(),
    cuentaContable: String(get('cuentaContable') ?? '').trim(),
    referencias: String(get('referencias') ?? '').trim(),
    cargos: get('cargos'),
    abonos: get('abonos'),
  };
}
function sheetRowsFromBuffer(buffer: Buffer): Record<string, any>[] {
  const workbook = xlsx.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames?.[0];
  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];

  // defval: para que celdas vacías existan como '' (o null)
  // raw: false para que xlsx intente convertir fechas/números a valores más “humanos”
  return xlsx.utils.sheet_to_json(sheet, { defval: null, raw: false });
}
function createDbXlsxFields(
  db_headers: Record<string, any>[],
  xlsx_headers_config: Record<string, any>,
) {
  const maped_headers: Record<string, any> = {};
  for (const db_header of db_headers) {
    if (db_header.id.toString() in xlsx_headers_config) {
      maped_headers[db_header.nombreBd] =
        xlsx_headers_config[db_header.id.toString()];
    }
  }
  return maped_headers;
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

function toMySqlDecimal2(value: unknown): string {
  if (value == null || value === '') return '0.00';

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value.toFixed(2) : '0.00';
  }

  if (typeof value !== 'string') {
    // Aquí decides: o regresas 0.00 o lanzas error.
    // Para carga masiva suele convenir no tronar:
    return '0.00';
  }

  const s = value.trim();
  if (!s) return '0.00';

  // Quita símbolos y espacios, conserva dígitos, punto y coma
  const cleaned = s.replace(/[^\d.,-]/g, '');

  // Heurística simple:
  // - Si trae coma y punto, asumimos coma miles y punto decimal: "1,234.56"
  // - Si solo trae coma, asumimos coma decimal: "1234,56" -> "1234.56"
  let normalized = cleaned;
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');
  if (hasComma && hasDot) {
    normalized = cleaned.replace(/,/g, '');
  } else if (hasComma && !hasDot) {
    normalized = cleaned.replace(/,/g, '.');
  }

  const n = Number(normalized);
  if (!Number.isFinite(n)) return '0.00';

  return n.toFixed(2);
}
