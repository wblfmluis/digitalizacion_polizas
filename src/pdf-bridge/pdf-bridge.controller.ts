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
  uploadFile(@Body() body: any) {
    return this.pdfBridgeService.updateFile(body);
  }

  @Patch('update-file-state')
  updateFileState(@Body() body: Record<string, any>) {
    if (!body?.fileId || !body?.state) {
      throw new BadRequestException('fileId y state son obligatorios.');
    }
    return this.pdfBridgeService.updateFileState(body.fileId, body.state);
  }
}
