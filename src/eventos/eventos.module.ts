import { Module } from '@nestjs/common';
import { EventosController } from './eventos.controller';
import { EventosService } from './eventos.service';
import { DatabaseModule } from '../database/database.module';
import { AppwriteService } from '../appwrite/appwrite.service';

@Module({
  imports: [DatabaseModule],
  controllers: [EventosController],
  providers: [EventosService, AppwriteService],
})
export class EventosModule {}
