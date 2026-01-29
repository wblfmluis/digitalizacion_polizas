import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Request,
  StreamableFile,
} from '@nestjs/common';
import { AppwriteService } from './appwrite.service';

@Controller('appwrite')
export class AppwriteController {
  constructor(private readonly appwriteService: AppwriteService) {}

  @Get('descargar-archivo/:bucketId/:fileId')
  async downloadFile(
    @Param('bucketId') bucketId: string,
    @Param('fileId') fileId: string,
  ): Promise<StreamableFile> {
    try {
      const result = await this.appwriteService.getFileForDownload(
        bucketId,
        fileId,
      );
      return new StreamableFile(result.buffer, {
        type: result.mimeType || 'application/pdf',
        disposition: `attachment; filename="${result.filename}"`,
        length: result.buffer.length,
      });
    } catch (e) {
      throw new HttpException(
        'Error al descargar el archivo',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
