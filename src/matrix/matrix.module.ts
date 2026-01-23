import { Module } from '@nestjs/common';
import { MatrixController } from './matrix.controller';
import { MatrixService } from './matrix.service';
import { DatabaseModule } from '../database/database.module';
import { AppwriteService } from '../appwrite/appwrite.service';

@Module({
  imports: [DatabaseModule],
  controllers: [MatrixController],
  providers: [MatrixService, AppwriteService],
})
export class MatrixModule {}
