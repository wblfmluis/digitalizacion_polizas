import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../../drizzle/schema';
import { and, desc, eq, gte, like, lte, or, sql, SQL } from 'drizzle-orm';
import { normalizeToMySqlDate } from '../utils/date';

@Injectable()
export class EventosService {
  private readonly logger = new Logger(EventosService.name);
  constructor(@Inject(DRIZZLE) private db: MySql2Database<typeof schema>) {}

  async logEvent(data: Record<string, any>, user: string) {
    this.logger.log(`Logging event for user ${user}`);
    return this.db.insert(schema.logEventos).values(data);
  }

  async viewLogEvent(params: Record<string, any>, user: string) {
    const { fechaFrom, fechaTo, q } = params;
    const { page, pageSize, offset } = normalizePagination(params);
    const conditions: SQL[] = [];
    let from: any = '';
    let to: any = '';
    if (fechaFrom && fechaTo) {
      from = fechaFrom
        ? normalizeToMySqlDate(fechaFrom, {
            preferDayFirst: false,
            fieldName: 'fechaFrom',
          })
        : null;
      to = fechaTo
        ? normalizeToMySqlDate(fechaTo, {
            preferDayFirst: false,
            fieldName: 'fechaTo',
          })
        : null;
      if (from && to && from > to) {
        throw new BadRequestException(
          'fechaFrom no puede ser mayor que fechaTo',
        );
      }
      if (from) conditions.push(gte(schema.poliza.fecha, from));
      if (to) conditions.push(lte(schema.poliza.fecha, to));
    }
    const qTrim = typeof q === 'string' ? q.trim() : '';
    if (qTrim.length > 0) {
      const pattern = `%${escapeLike(qTrim)}%`;

      const searchCondition = or(like(schema.logEventos.usuario, pattern));

      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }
    const where = conditions.length ? and(...conditions) : sql`true`;
    const [items, totalRow] = await Promise.all([
      this.db
        .select()
        .from(schema.logEventos)
        .leftJoin(
          schema.poliza,
          eq(schema.logEventos.idpoliza, schema.poliza.id),
        )
        .innerJoin(
          schema.cTipoAccion,
          eq(schema.logEventos.idcTipoAccion, schema.cTipoAccion.id),
        )
        .where(where)
        .orderBy(desc(schema.logEventos.id))
        .limit(pageSize)
        .offset(offset),

      this.db
        .select({ total: sql<number>`count(*)` })
        .from(schema.logEventos)
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
}
function escapeLike(input: string) {
  // Escapa caracteres especiales de LIKE: \ % _
  // MySQL: el caracter de escape por defecto puede variar; este enfoque suele ser suficiente
  // para evitar que el usuario inyecte comodines involuntarios.
  return input.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}
type Pagination = { page?: number; pageSize?: number };
function normalizePagination(p: Pagination) {
  const page = Math.max(1, Number(p.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(p.pageSize ?? 20))); // cap
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
}
