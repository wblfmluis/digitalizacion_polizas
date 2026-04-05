import {
  Controller,
  UploadedFile,
  Body,
  BadRequestException,
  Post,
  Patch,
} from '@nestjs/common';
import type { Express, Response } from 'express';
import { PdfBridgeService } from './pdf-bridge.service';

@Controller('pdf-bridge')
export class PdfBridgeController {
  constructor(private readonly pdfBridgeService: PdfBridgeService) {}
  @Post('update-optimized-pdf')
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
