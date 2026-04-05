import {
  Controller,
  UploadedFile,
  Body,
  BadRequestException,
  Post,
  Patch,
  UseInterceptors,
} from '@nestjs/common';
import type { Express, Response } from 'express';
import { PdfBridgeService } from './pdf-bridge.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('pdf-bridge')
export class PdfBridgeController {
  constructor(private readonly pdfBridgeService: PdfBridgeService) {}
  @Post('update-optimized-pdf')
  @UseInterceptors(
    FileInterceptor('file', {
      // 10 MB
      fileFilter: (req, file, cb) => {
        const allowedMime = new Set(['application/pdf']);

        if (!allowedMime.has(file.mimetype)) {
          return cb(
            new BadRequestException(
              'Archivo no válido. Es necesario cargar un archivo PDF (.pdf).',
            ) as any,
            false,
          );
        }

        cb(null, true);
      },
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File, @Body() body: any) {
    if (!file) {
      throw new BadRequestException('No se ha proporcionado ningún archivo.');
    }
    return this.pdfBridgeService.updateFile(file, body);
  }

  @Patch('update-file-state')
  updateFileState(@Body() body: Record<string, any>) {
    if (!body?.fileId || !body?.state) {
      throw new BadRequestException('fileId y state son obligatorios.');
    }
    return this.pdfBridgeService.updateFileState(body.fileId, body.state);
  }
}
