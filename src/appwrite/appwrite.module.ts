import { Module } from '@nestjs/common';
import { AppwriteService } from './appwrite.service';

@Module({
  providers: [AppwriteService]
})
export class AppwriteModule {}
