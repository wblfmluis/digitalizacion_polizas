import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { and, eq, ne, sql } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { DRIZZLE } from '../database/database.module';
import * as schema from '../db/schema';
import { AuthUser, RoleKey } from '../auth/types/auth-user.type';

type CreateUserDto = {
  email: string;
  password: string;
  nombre?: string;
  name?: string;
  roles?: RoleKey[];
};

type UpdateUserDto = {
  email?: string;
  nombre?: string;
  name?: string;
  status?: number;
};

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private db: MySql2Database<typeof schema>) {}

  async createUser(data: CreateUserDto, currentUser: AuthUser) {
    const email = normalizeEmail(data.email);
    await this.assertEmailAvailable(email);

    const passwordHash = await bcrypt.hash(data.password, 12);
    const [inserted] = await this.db.insert(schema.usuario).values({
      email,
      nombre: data.nombre || data.name || email,
      passwordHash,
      createdBy: currentUser.email,
    });
    const userId = Number((inserted as Record<string, any>)?.insertId);
    await this.setUserRoles(
      userId,
      data.roles?.length ? data.roles : ['consulta'],
    );
    return this.findOne(userId);
  }

  async findAll() {
    const rows = await this.db
      .select({
        id: schema.usuario.id,
        nombre: schema.usuario.nombre,
        email: schema.usuario.email,
        status: schema.usuario.status,
        lastLoginAt: schema.usuario.lastLoginAt,
        createdAt: schema.usuario.createdAt,
        role: schema.rol.clave,
      })
      .from(schema.usuario)
      .leftJoin(
        schema.usuarioRol,
        eq(schema.usuario.id, schema.usuarioRol.idusuario),
      )
      .leftJoin(schema.rol, eq(schema.usuarioRol.idrol, schema.rol.id))
      .where(eq(schema.usuario.status, 1));

    return groupUsers(rows);
  }

  async findOne(id: number) {
    const users = await this.findAll();
    const user = users.find((it) => it.id === id);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async updateUser(id: number, data: UpdateUserDto, currentUser: AuthUser) {
    const [existing] = await this.db
      .select()
      .from(schema.usuario)
      .where(eq(schema.usuario.id, id))
      .limit(1);
    if (!existing) throw new NotFoundException('Usuario no encontrado');

    const email = data.email ? normalizeEmail(data.email) : undefined;
    if (email) await this.assertEmailAvailable(email, id);

    await this.db
      .update(schema.usuario)
      .set({
        ...(email ? { email } : {}),
        ...(data.nombre || data.name
          ? { nombre: data.nombre || data.name }
          : {}),
        ...(data.status !== undefined ? { status: Number(data.status) } : {}),
        updatedAt: sql`(CURRENT_TIMESTAMP)`,
        updatedBy: currentUser.email,
      })
      .where(eq(schema.usuario.id, id));

    return this.findOne(id);
  }

  async updatePassword(id: number, password: string, currentUser: AuthUser) {
    const passwordHash = await bcrypt.hash(password, 12);
    await this.db
      .update(schema.usuario)
      .set({
        passwordHash,
        updatedAt: sql`(CURRENT_TIMESTAMP)`,
        updatedBy: currentUser.email,
      })
      .where(eq(schema.usuario.id, id));
    return { message: 'Password actualizado' };
  }

  async updateRoles(id: number, roles: RoleKey[]) {
    await this.findOne(id);
    await this.setUserRoles(id, roles);
    return this.findOne(id);
  }

  async remove(id: number, currentUser: AuthUser) {
    await this.db
      .update(schema.usuario)
      .set({
        status: 0,
        deletedAt: sql`(CURRENT_TIMESTAMP)`,
        deletedBy: currentUser.email,
      })
      .where(eq(schema.usuario.id, id));
    return { success: true };
  }

  private async setUserRoles(idusuario: number, roles: RoleKey[]) {
    const roleRows = await this.db.select().from(schema.rol);
    const selectedRoles = roleRows.filter((role) =>
      roles.includes(role.clave as RoleKey),
    );

    await this.db
      .delete(schema.usuarioRol)
      .where(eq(schema.usuarioRol.idusuario, idusuario));

    if (selectedRoles.length) {
      await this.db.insert(schema.usuarioRol).values(
        selectedRoles.map((role) => ({
          idusuario,
          idrol: role.id,
        })),
      );
    }
  }

  private async assertEmailAvailable(email: string, ignoreId?: number) {
    const condition = ignoreId
      ? and(eq(schema.usuario.email, email), ne(schema.usuario.id, ignoreId))
      : eq(schema.usuario.email, email);
    const [existing] = await this.db
      .select({ id: schema.usuario.id })
      .from(schema.usuario)
      .where(condition)
      .limit(1);
    if (existing) throw new ConflictException('El email ya esta registrado');
  }
}

function normalizeEmail(email: string) {
  return String(email ?? '').trim().toLowerCase();
}

function groupUsers(rows: Array<Record<string, any>>) {
  const users = new Map<number, Record<string, any>>();
  for (const row of rows) {
    if (!users.has(row.id)) {
      users.set(row.id, {
        id: row.id,
        nombre: row.nombre,
        name: row.nombre,
        email: row.email,
        status: row.status,
        lastLoginAt: row.lastLoginAt,
        createdAt: row.createdAt,
        roles: [],
      });
    }
    if (row.role) users.get(row.id)?.roles.push(row.role);
  }
  return Array.from(users.values());
}
