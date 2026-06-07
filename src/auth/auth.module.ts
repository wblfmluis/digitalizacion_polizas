import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, RolesGuard],
  exports: [AuthService, AuthGuard, RolesGuard, JwtModule],
})
export class AuthModule implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuthModule.name);

  constructor(private readonly authService: AuthService) {}

  async onApplicationBootstrap() {
    try {
      await this.authService.ensureBootstrapAdmin();
    } catch (error: any) {
      this.logger.warn(
        `No se pudo ejecutar seed de admin: ${error?.message ?? String(error)}`,
      );
    }
  }
}
