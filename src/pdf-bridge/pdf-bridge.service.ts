import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { DRIZZLE } from '../database/database.module';
import { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { AppwriteService } from '../appwrite/appwrite.service';
import * as fsp from 'fs/promises';
import * as fs from 'node:fs';

@Injectable()
export class PdfBridgeService {
  private readonly logger = new Logger(PdfBridgeService.name);
  constructor(
    @Inject(DRIZZLE) private db: MySql2Database<typeof schema>,
    private readonly appwriteService: AppwriteService,
  ) {}

  async updateFileState(fileId: string, state: string) {
    if (!fileId) {
      throw new BadRequestException('File ID is required');
    }
    return this.db
      .update(schema.archivoMetadata)
      .set({
        fileState: state,
        updatedBy: 'PDF OPTIMIZER',
      })
      .where(eq(schema.archivoMetadata.fileId, fileId));
  }

  async updateFile(body: Record<string, any>) {
    this.logger.debug('Updating file with body:', body);

    const fileId = body.fileId;
    const exist_metadata = await this.db.query.archivoMetadata.findFirst({
      where: eq(schema.archivoMetadata.fileId, fileId),
    });
    this.logger.debug('Exist metadata:', exist_metadata);
    if (!exist_metadata) {
      this.logger.error(`File not found in database: ${fileId}`);
      throw new BadRequestException('File not found in database');
    }
    if (
      !exist_metadata.bucketId ||
      !exist_metadata.nombre ||
      !exist_metadata.mimetype
    ) {
      this.logger.error(
        `File metadata incomplete: ${JSON.stringify(exist_metadata)}`,
      );
      throw new BadRequestException('File metadata incomplete');
    }
    const stat = await fs.promises.stat(
      process.env.TEMP_DIR + '/' + 'optimized-' + body.fileName,
    );
    let saveToAppwrite: {
      $id: any;
      bucketId?: string;
      $createdAt?: string;
      $updatedAt?: string;
      $permissions?: string[];
      name?: string;
      signature?: string;
      mimeType?: string;
      sizeOriginal?: number;
      chunksTotal?: number;
      chunksUploaded?: number;
    };
    if (stat.size > 500 * 1024 * 1024) {
      saveToAppwrite = await this.appwriteService.uploadLargeFileFromPath(
        exist_metadata.bucketId,
        process.env.TEMP_DIR + '/' + 'optimized-' + body.fileName,
        'optimized-' + body.fileName,
      );
    } else {
      saveToAppwrite = await this.appwriteService.uploadFileFromPath(
        process.env.TEMP_DIR + '/' + 'optimized-' + body.fileName,
        'optimized-' + body.fileName,
        exist_metadata.bucketId,
        'application/pdf',
      );
    }
    const meta_file = await fsp.stat(
      process.env.TEMP_DIR + '/' + 'optimized-' + body.fileName,
    );
    this.logger.debug('Save to appwrite:', saveToAppwrite);
    if (saveToAppwrite?.$id) {
      await this.db
        .update(schema.archivoMetadata)
        .set({
          fileId: saveToAppwrite?.$id,
          updatedBy: 'PDF OPTIMIZER',
          fileState: 'OPTIMIZED',
          optimizedSize: meta_file.size,
        })
        .where(eq(schema.archivoMetadata.id, exist_metadata.id));
      await this.appwriteService.deleteFile(exist_metadata.bucketId, fileId);
    }
    fs.unlinkSync(process.env.TEMP_DIR + '/' + 'optimized-' + body.fileName);
    fs.unlinkSync(process.env.TEMP_DIR + '/' + body.fileName);
    return {
      fileId: saveToAppwrite?.$id ?? fileId,
      message: 'Done',
    };
  }
}
