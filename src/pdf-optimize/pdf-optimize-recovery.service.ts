import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Inject } from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../../drizzle/schema';
import { and, eq, isNull } from 'drizzle-orm';

@Injectable()
export class PdfOptimizeRecoveryService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PdfOptimizeRecoveryService.name);

  constructor(
    @InjectQueue('pdf-optimize') private readonly pdfOptimizeQueue: Queue,
    @Inject(DRIZZLE) private db: MySql2Database<typeof schema>,
  ) {}

  async onApplicationBootstrap() {
    await this.requeuePendingFiles();
  }

  private async requeuePendingFiles() {
    this.logger.log('Buscando archivos pendientes para optimización...');

    const pendingFiles = await this.db
      .select({
        id: schema.archivoMetadata.id,
        fileId: schema.archivoMetadata.fileId,
        bucketId: schema.archivoMetadata.bucketId,
        fileState: schema.archivoMetadata.fileState,
      })
      .from(schema.archivoMetadata)
      .where(
        and(
          eq(schema.archivoMetadata.fileState, 'UPLOADED'),
          isNull(schema.archivoMetadata.deletedAt),
        ),
      );

    if (!pendingFiles.length) {
      this.logger.log('No hay archivos pendientes por optimizar');
      return;
    }

    this.logger.log(
      `Se encontraron ${pendingFiles.length} archivos pendientes`,
    );

    for (const file of pendingFiles) {
      if (!file.id || !file.fileId || !file.bucketId) {
        this.logger.warn(
          `Saltando archivo incompleto: id=${file.id}, fileId=${file.fileId}, bucketId=${file.bucketId}`,
        );
        continue;
      }

      try {
        const polizaRows = await this.db
          .select({
            id: schema.poliza.id,
          })
          .from(schema.poliza)
          .where(eq(schema.poliza.idarchivoMetadata, file.id))
          .limit(1);

        const policyId = polizaRows[0]?.id;

        await this.db
          .update(schema.archivoMetadata)
          .set({
            fileState: 'PROCESSING',
          })
          .where(
            and(
              eq(schema.archivoMetadata.id, file.id),
              eq(schema.archivoMetadata.fileState, 'UPLOADED'),
            ),
          );

        await this.pdfOptimizeQueue.add(
          'optimize',
          {
            archivoMetadataId: file.id,
            policyId,
            bucketId: file.bucketId,
            originalFileId: file.fileId,
            profile: 'ebook',
          },
          {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: 1000,
            removeOnFail: 5000,
            jobId: `pdf-optimize-${file.id}`,
          },
        );

        this.logger.log(
          `Reencolado archivo id=${file.id} fileId=${file.fileId} policyId=${policyId ?? 'n/a'}`,
        );
      } catch (error: any) {
        this.logger.error(
          `Error reencolando archivo id=${file.id}: ${error?.message ?? String(error)}`,
          error?.stack,
        );
      }
    }

    this.logger.log('Barrido de archivos pendientes finalizado');
  }
}
