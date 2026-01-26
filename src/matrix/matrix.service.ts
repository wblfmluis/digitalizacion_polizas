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

  async updateMatrix(
    id: number,
    data: Record<string, any>,
    user: string,
    file?: Express.Multer.File,
  ) {
    try {
      if (data.conf_db_to_xls) {
        data.confDbToXls = data.conf_db_to_xls;
        delete data.conf_db_to_xls;
      }
      if (data.conf_xls_to_db) {
        data.confXlsToDb = data.conf_xls_to_db;
        delete data.conf_xls_to_db;
      }
      /*
      const json_conf_db_to_xls = {
        1: 'POLIZA',
        2: 'TIPO',
        3: 'FECHA',
        4: 'CONCEPTO',
        5: 'DESCRIPCION',
        6: 'CUENTA CONTABLE',
        7: 'REFERENCIAS',
        8: 'CARGOS',
        9: 'ABONOS',
      };
      data.confDbToXls = JSON.stringify(json_conf_db_to_xls);
       */
      if (!file || !file?.buffer) {
        return this.db
          .update(schema.matriz)
          .set({
            ...data,
            updatedAt: sql`(CURRENT_TIMESTAMP)`,
            updatedBy: user,
          })
          .where(eq(schema.matriz.id, id));
      } else {
        const rows = await this.db
          .select()
          .from(schema.matriz)
          .where(eq(schema.matriz.id, id))
          .limit(1);
        const matrix = rows[0];
        if (!matrix) {
          throw new NotFoundException(`Matriz ${id} no encontrada`);
        }
        if (!matrix.bucketId) {
          throw new BadRequestException(
            `La matriz ${id} no tiene bucketId asignado`,
          );
        }
        const saveToAppwrite = await this.appwriteService.uploadFile(
          file.buffer,
          file.originalname,
          matrix.bucketId,
          file.mimetype,
        );
        return this.db
          .update(schema.matriz)
          .set({
            ...data,
            fileId: saveToAppwrite.$id,
            bucketId: matrix.bucketId,
            updatedAt: sql`(CURRENT_TIMESTAMP)`,
            updatedBy: user,
          })
          .where(eq(schema.matriz.id, id));
      }
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
    if (result.confDbToXls) result.confDbToXls = JSON.parse(result.confDbToXls);
    if (result.confXlsToDb) result.confXlsToDb = JSON.parse(result.confXlsToDb);
    result.c_ejercicio = c_ejercicio;
    result.excel_headers = excel_headers;
    return result;
  }

  async procesar_polizas(idmatriz: number) {
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
      this.logger.log('Generando mapeo de campos');
      return maped_header;
    } catch (e) {
      this.logger.error('Error al procesar las pólizas: ' + e.message);
    }
  }
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
