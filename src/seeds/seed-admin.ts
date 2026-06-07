import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AuthService } from '../auth/auth.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const authService = app.get(AuthService);
  await authService.ensureBootstrapAdmin();
  await app.close();
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
