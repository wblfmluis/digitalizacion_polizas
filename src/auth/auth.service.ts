import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MySql2Database } from 'drizzle-orm/mysql2';
import { and, eq, sql } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { DRIZZLE } from '../database/database.module';
import * as schema from '../db/schema';
import { AuthUser, RoleKey } from './types/auth-user.type';
import { ROLE_NAMES } from './auth.constants';

@Injectable()
export class AuthService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DRIZZLE) private db: MySql2Database<typeof schema>,
    private readonly jwtService: JwtService,
  ) {}

  async onApplicationBootstrap() {
    await this.ensureBootstrapAdmin();
  }

  async login(email: string, password: string) {
    const normalizedEmail = String(email ?? '').trim().toLowerCase();
    const [user] = await this.db
      .select()
      .from(schema.usuario)
      .where(eq(schema.usuario.email, normalizedEmail))
      .limit(1);

    if (!user || user.status !== 1) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    const roles = await this.getUserRoles(user.id);
    const authUser: AuthUser = {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      roles,
    };

    await this.db
      .update(schema.usuario)
      .set({ lastLoginAt: sql`(CURRENT_TIMESTAMP)` })
      .where(eq(schema.usuario.id, user.id));

    return {
      user: authUser,
      token: this.sign(authUser),
    };
  }

  sign(user: AuthUser) {
    return this.jwtService.sign(
      {
        sub: user.id,
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        roles: user.roles,
      },
      {
        secret: getAuthSecret(),
        expiresIn: (process.env.AUTH_JWT_EXPIRES_IN ?? '8h') as any,
      },
    );
  }

  async getUserRoles(idusuario: number): Promise<RoleKey[]> {
    const rows = await this.db
      .select({ clave: schema.rol.clave })
      .from(schema.usuarioRol)
      .innerJoin(schema.rol, eq(schema.usuarioRol.idrol, schema.rol.id))
      .where(eq(schema.usuarioRol.idusuario, idusuario));

    return rows
      .map((row) => row.clave as RoleKey)
      .filter((role) => role in ROLE_NAMES);
  }

  async ensureBootstrapAdmin() {
    await this.ensureRoles();

    const email = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.INITIAL_ADMIN_PASSWORD;
    const nombre = process.env.INITIAL_ADMIN_NAME?.trim() || 'Administrador';

    if (!email || !password) {
      this.logger.warn(
        'INITIAL_ADMIN_EMAIL/INITIAL_ADMIN_PASSWORD no definidos; se omite seed de admin',
      );
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [existing] = await this.db
      .select()
      .from(schema.usuario)
      .where(eq(schema.usuario.email, email))
      .limit(1);

    let userId = existing?.id;

    if (existing) {
      await this.db
        .update(schema.usuario)
        .set({
          nombre,
          passwordHash,
          status: 1,
          updatedAt: sql`(CURRENT_TIMESTAMP)`,
          updatedBy: 'seed',
        })
        .where(eq(schema.usuario.id, existing.id));
    } else {
      const [inserted] = await this.db.insert(schema.usuario).values({
        nombre,
        email,
        passwordHash,
        createdBy: 'seed',
      });
      userId = Number((inserted as Record<string, any>)?.insertId);
    }

    if (!userId) return;

    const [adminRole] = await this.db
      .select()
      .from(schema.rol)
      .where(eq(schema.rol.clave, 'admin'))
      .limit(1);

    if (!adminRole) return;

    const [existingUserRole] = await this.db
      .select()
      .from(schema.usuarioRol)
      .where(
        and(
          eq(schema.usuarioRol.idusuario, userId),
          eq(schema.usuarioRol.idrol, adminRole.id),
        ),
      )
      .limit(1);

    if (!existingUserRole) {
      await this.db.insert(schema.usuarioRol).values({
        idusuario: userId,
        idrol: adminRole.id,
      });
    }
  }

  private async ensureRoles() {
    for (const [clave, nombre] of Object.entries(ROLE_NAMES)) {
      const [existing] = await this.db
        .select()
        .from(schema.rol)
        .where(eq(schema.rol.clave, clave))
        .limit(1);

      if (!existing) {
        await this.db.insert(schema.rol).values({
          clave,
          nombre,
          createdBy: 'seed',
        });
      }
    }
  }
}

export function getAuthSecret() {
  return (
    process.env.AUTH_JWT_SECRET ??
    'digitalizacion-polizas-dev-secret-change-me'
  );
}
