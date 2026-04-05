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

  async updateFile(file: Express.Multer.File, body: Record<string, any>) {
    if (!file || !file.buffer || !body?.fileId) {
      this.logger.error('File is required: Not recieved file or fileId');
      throw new BadRequestException('File is required');
    }
    const fileId = body.fileId;
    const exist_metadata = await this.db.query.archivoMetadata.findFirst({
      where: eq(schema.archivoMetadata.fileId, fileId),
    });
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
    const saveToAppwrite = await this.appwriteService.uploadFile(
      file.buffer,
      exist_metadata.nombre,
      exist_metadata.bucketId,
      exist_metadata.mimetype,
    );
    if (saveToAppwrite?.$id) {
      await this.db
        .update(schema.archivoMetadata)
        .set({
          fileId: saveToAppwrite?.$id,
          updatedBy: 'PDF OPTIMIZER',
          fileState: 'OPTIMIZED',
          optimizedSize: file.size,
        })
        .where(eq(schema.archivoMetadata.id, exist_metadata.id));
      await this.appwriteService.deleteFile(exist_metadata.bucketId, fileId);
    }
    return {
      fileId: saveToAppwrite?.$id ?? fileId,
      message: 'Done',
    };
  }
}
