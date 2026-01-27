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
} from 'drizzle-orm';
import { AppwriteService } from '../appwrite/appwrite.service';

@Injectable()
export class PoliciesService {
  private readonly logger = new Logger(PoliciesService.name);
  constructor(
    @Inject(DRIZZLE) private db: MySql2Database<typeof schema>,
    private readonly appwriteService: AppwriteService,
  ) {}

  async getPolicies(params: Record<string, any>, user: string) {
    const { idejercicio, idmatriz } = params;
    const { page, pageSize, offset } = normalizePagination(params);

    const conditions: SQL[] = [];
    conditions.push(eq(schema.poliza.status, 1));
    if (idejercicio) {
      conditions.push(eq(schema.poliza.idejercicio, Number(idejercicio)));
    }
    if (idmatriz) {
      conditions.push(eq(schema.poliza.idmatriz, Number(idmatriz)));
    }
    const where = conditions.length ? and(...conditions) : sql`true`;

    const [items, totalRow] = await Promise.all([
      this.db
        .select()
        .from(schema.poliza)
        .where(where)
        .orderBy(desc(schema.poliza.id)) // SIEMPRE orderBy para paginar
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
}

type Pagination = { page?: number; pageSize?: number };

function normalizePagination(p: Pagination) {
  const page = Math.max(1, Number(p.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(p.pageSize ?? 20))); // cap
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
}
