import {
  Body,
  Controller,
  Get,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AUTH_COOKIE_NAME } from './auth.constants';
import { AuthGuard } from './guards/auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthUser } from './types/auth-user.type';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { user, token } = await this.authService.login(
      body.email,
      body.password,
    );
    res.cookie(AUTH_COOKIE_NAME, token, cookieOptions(true));
    return { user };
  }

  @UseGuards(AuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return { user };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(AUTH_COOKIE_NAME, cookieOptions(false));
    return { message: 'Sesion cerrada' };
  }
}

function cookieOptions(withMaxAge: boolean) {
  const isProduction = process.env.NODE_ENV === 'production';
  const options = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: isProduction,
    path: '/',
  };
  return withMaxAge ? { ...options, maxAge: 8 * 60 * 60 * 1000 } : options;
}
