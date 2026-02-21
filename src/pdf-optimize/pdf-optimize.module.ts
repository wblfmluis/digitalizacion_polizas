import { Module } from '@nestjs/common';
import { QueueModule } from '../queue/queue.module';
import { PdfOptimizeProcessor } from './pdf-optimize.processor';
import { PdfOptimizeService } from './pdf-optimize.service';
import { AppwriteService } from '../appwrite/appwrite.service';
import { EventosService } from '../eventos/eventos.service';
import { DatabaseModule } from '../database/database.module';
import { AppwriteModule } from '../appwrite/appwrite.module';

@Module({
  imports: [QueueModule, DatabaseModule, AppwriteModule],
  providers: [
    PdfOptimizeProcessor,
    PdfOptimizeService,
    EventosService,
    AppwriteService,
  ],
})
export class PdfOptimizeModule {}
