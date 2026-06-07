export type RoleKey = 'admin' | 'operador' | 'consulta';

export type AuthUser = {
  id: number;
  nombre: string;
  email: string;
  roles: RoleKey[];
};

export type JwtPayload = AuthUser & {
  sub: number;
};
