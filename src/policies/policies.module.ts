import { Module } from '@nestjs/common';
import { PoliciesController } from './policies.controller';
import { PoliciesService } from './policies.service';
import { DatabaseModule } from '../database/database.module';
import { AppwriteService } from '../appwrite/appwrite.service';
import { EventosService } from '../eventos/eventos.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PoliciesController],
  providers: [PoliciesService, AppwriteService, EventosService],
})
export class PoliciesModule {}
