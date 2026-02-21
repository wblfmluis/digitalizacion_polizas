import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { AppwriteModule } from './appwrite/appwrite.module';
import { CatalogModule } from './catalog/catalog.module';
import { MatrixModule } from './matrix/matrix.module';
import { PoliciesModule } from './policies/policies.module';
import { EventosModule } from './eventos/eventos.module';
import { ReportsModule } from './reports/reports.module';
import { QueueModule } from './queue/queue.module';
import { PdfOptimizeService } from './pdf-optimize/pdf-optimize.service';
import { PdfOptimizeModule } from './pdf-optimize/pdf-optimize.module';
import { WorkerModule } from './worker/worker.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    UsersModule,
    AppwriteModule,
    CatalogModule,
    MatrixModule,
    PoliciesModule,
    EventosModule,
    ReportsModule,
    QueueModule,
    PdfOptimizeModule,
    WorkerModule,
  ],
  controllers: [],
  providers: [PdfOptimizeService],
})
export class AppModule {}
