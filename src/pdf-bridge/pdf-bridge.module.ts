import { Module } from '@nestjs/common';
import { PdfBridgeController } from './pdf-bridge.controller';
import { PdfBridgeService } from './pdf-bridge.service';
import { DatabaseModule } from '../database/database.module';
import { AppwriteService } from '../appwrite/appwrite.service';
import { EventosService } from '../eventos/eventos.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PdfBridgeController],
  providers: [PdfBridgeService, AppwriteService, EventosService],
})
export class PdfBridgeModule {}
