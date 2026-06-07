import { Module } from '@nestjs/common';
import { AppwriteService } from './appwrite.service';
import { AppwriteController } from './appwrite.controller';
import { DatabaseModule } from '../database/database.module';
import { EventosService } from '../eventos/eventos.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule],
  providers: [AppwriteService, EventosService],
  controllers: [AppwriteController],
})
export class AppwriteModule {}
