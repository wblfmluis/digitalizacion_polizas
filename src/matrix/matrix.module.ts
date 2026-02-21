import { Module } from '@nestjs/common';
import { MatrixController } from './matrix.controller';
import { MatrixService } from './matrix.service';
import { DatabaseModule } from '../database/database.module';
import { AppwriteService } from '../appwrite/appwrite.service';
import { PoliciesService } from '../policies/policies.service';
import { EventosService } from '../eventos/eventos.service';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [DatabaseModule, QueueModule],
  controllers: [MatrixController],
  providers: [MatrixService, AppwriteService, PoliciesService, EventosService],
})
export class MatrixModule {}
