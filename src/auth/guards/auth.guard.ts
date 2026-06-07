import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AUTH_COOKIE_NAME } from '../auth.constants';
import { JwtPayload } from '../types/auth-user.type';
import { getAuthSecret } from '../auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Optional() private readonly jwtService: JwtService = new JwtService(),
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.cookies?.[AUTH_COOKIE_NAME];

    if (!token) {
      throw new UnauthorizedException('Sesion requerida');
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: getAuthSecret(),
      });
      request.user = {
        id: payload.sub,
        nombre: payload.nombre,
        email: payload.email,
        roles: payload.roles ?? [],
      };
      return true;
    } catch {
      throw new UnauthorizedException('Sesion invalida o expirada');
    }
  }
}
