import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PdfOptimizeModule } from '../pdf-optimize/pdf-optimize.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PdfOptimizeModule],
})
export class WorkerModule {}
