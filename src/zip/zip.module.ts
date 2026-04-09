import { Module } from '@nestjs/common';
import { ZipService } from './zip.service';
import { AppwriteModule } from '../appwrite/appwrite.module';

@Module({
  imports: [AppwriteModule],
  providers: [ZipService],
  exports: [ZipService],
})
export class ZipModule {}
