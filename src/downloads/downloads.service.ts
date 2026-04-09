import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'node:path';
import { createReadStream, promises as fs } from 'node:fs';
import { ZipService, ZipFileItem } from '../zip/zip.service';
import { pipeline } from 'node:stream/promises';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type ZipJobRecord = {
  id: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  zipFilename: string;
  filePath?: string;
  size?: number;
  error?: string;
  totalFiles: number;
}

@Injectable()
export class DownloadsService {
  private readonly logger = new Logger(DownloadsService.name);

  /**
   * Demo simple en memoria.
   * En producción cámbialo por DB con Drizzle.
   */
  private readonly jobs = new Map<string, ZipJobRecord>();

  constructor(private readonly zipService: ZipService) {}

  async downloadZipNow(
    files: ZipFileItem[],
    zipFilename: string,
    res: Response,
  ) {
    await this.zipService.streamZipToHttpResponse(files, zipFilename, res);
  }

  async createZipJob(files: ZipFileItem[], zipFilename: string) {
    const jobId = randomUUID();
    const outputPath = join(tmpdir(), 'app-zips', `${jobId}.zip`);

    const now = new Date().toISOString();

    this.jobs.set(jobId, {
      id: jobId,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      zipFilename,
      totalFiles: files.length,
    });

    void this.runJob(jobId, files, zipFilename, outputPath);

    return {
      jobId,
      status: 'pending',
    };
  }

  getJob(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new NotFoundException('Job no encontrado');
    }
    return job;
  }

  async streamJobFile(jobId: string, res: Response) {
    const job = this.getJob(jobId);

    if (job.status !== 'completed' || !job.filePath) {
      throw new NotFoundException('ZIP aún no disponible');
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${job.zipFilename}"`,
    );

    await pipeline(createReadStream(job.filePath), res);
  }

  private async runJob(
    jobId: string,
    files: ZipFileItem[],
    zipFilename: string,
    outputPath: string,
  ) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    try {
      this.jobs.set(jobId, {
        ...job,
        status: 'processing',
        updatedAt: new Date().toISOString(),
      });

      const result = await this.zipService.createZipFileOnDisk(
        files,
        outputPath,
      );

      this.jobs.set(jobId, {
        ...this.jobs.get(jobId)!,
        status: 'completed',
        updatedAt: new Date().toISOString(),
        filePath: result.path,
        size: result.size,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`Job ${jobId} failed: ${message}`);

      this.jobs.set(jobId, {
        ...this.jobs.get(jobId)!,
        status: 'failed',
        updatedAt: new Date().toISOString(),
        error: message,
      });

      await this.zipService.removeFileIfExists(outputPath);
    }
  }

  async cleanupExpiredJobs(maxAgeHours = 24) {
    const now = Date.now();

    for (const [jobId, job] of this.jobs.entries()) {
      const ageMs = now - new Date(job.updatedAt).getTime();
      if (ageMs > maxAgeHours * 60 * 60 * 1000) {
        if (job.filePath) {
          await this.zipService.removeFileIfExists(job.filePath);
        }
        this.jobs.delete(jobId);
      }
    }
  }
}
