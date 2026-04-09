import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { DownloadsService, ZipJobRecord } from './downloads.service';
import { DownloadZipDto } from './dto/download-zip.dto';
import { CreateZipJobDto } from './dto/create-zip-job.dto';

@Controller('downloads')
export class DownloadsController {
  constructor(private readonly downloadsService: DownloadsService) {}

  @Post('zip')
  async downloadZipNow(@Body() body: DownloadZipDto, @Res() res: Response) {
    const zipFilename = body.zipFilename || `archivos-${Date.now()}.zip`;

    await this.downloadsService.downloadZipNow(body.files, zipFilename, res);
  }

  @Post('zip-jobs')
  async createZipJob(@Body() body: CreateZipJobDto) {
    const zipFilename = body.zipFilename || `archivos-${Date.now()}.zip`;

    return await this.downloadsService.createZipJob(body.files, zipFilename);
  }

  @Get('zip-jobs/:jobId')
  async getZipJob(@Param('jobId') jobId: string): Promise<ZipJobRecord> {
    return this.downloadsService.getJob(jobId);
  }

  @Get('zip-jobs/:jobId/file')
  async downloadZipJobFile(
    @Param('jobId') jobId: string,
    @Res() res: Response,
  ) {
    await this.downloadsService.streamJobFile(jobId, res);
  }
}
