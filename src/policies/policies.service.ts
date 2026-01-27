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
import { and, eq, like, gte, lte, inArray, sql, type SQL } from 'drizzle-orm';
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
    const conditions: SQL[] = [];
    conditions.push(eq(schema.poliza.status, 1));
    if (idejercicio != null || idejercicio != undefined) {
      conditions.push(eq(schema.poliza.idejercicio, Number(idejercicio)));
    }
    if (idmatriz != null || idmatriz != undefined) {
      conditions.push(eq(schema.poliza.idmatriz, Number(idmatriz)));
    }
    return this.db
      .select()
      .from(schema.poliza)
      .where(conditions.length ? and(...conditions) : sql`true`);
  }
}
