import { Module } from '@nestjs/common';
import { PoliciesController } from './policies.controller';
import { PoliciesService } from './policies.service';
import { DatabaseModule } from '../database/database.module';
import { AppwriteService } from '../appwrite/appwrite.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PoliciesController],
  providers: [PoliciesService, AppwriteService],
})
export class PoliciesModule {}
