import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Models } from 'node-appwrite';

export const UserCookie = createParamDecorator(
  (open_cookie: AppwriteSession, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const cookie = request.cookies['appwrite-user-session'];
    if (cookie) {
      open_cookie = JSON.parse(cookie);
    }
    if (open_cookie.decoded_jwt) {
      return open_cookie.decoded_jwt.userId;
    } else {
      return 'system';
    }
  },
);

export const UserJwt = createParamDecorator(
  (open_cookie: AppwriteSession, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const cookie = request.cookies['appwrite-user-session'];
    if (cookie) {
      open_cookie = JSON.parse(cookie);
    }
    if (open_cookie.jwt) {
      return open_cookie.jwt;
    } else {
      return null;
    }
  },
);
export interface AppwriteDecodedJwt {
  userId: string;
  sessionId: string;
  /**
   * En segundos
   */
  exp: number;
}

/**
 * Usado como cookie interna para validación SSR
 */
export interface AppwriteSession {
  jwt: string;
  decoded_jwt: AppwriteDecodedJwt;
  details: Models.User<Models.Preferences> | undefined;
}
