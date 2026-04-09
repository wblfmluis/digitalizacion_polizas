import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';
import archiver from 'archiver';
import { createWriteStream, promises as fs } from 'node:fs';
import { dirname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { AppwriteService } from '../appwrite/appwrite.service';

export interface ZipFileItem {
  fileId: string;
  bucketId: string;
  filename?: string;
}

@Injectable()
export class ZipService {
  private readonly logger = new Logger(ZipService.name);

  constructor(private readonly appwriteService: AppwriteService) {}

  private async appendFileToArchive(
    archive: archiver.Archiver,
    item: ZipFileItem,
    usedNames: Set<string>,
  ) {
    const fileInfo = await this.appwriteService.getFileInfo(
      item.bucketId,
      item.fileId,
    );

    const originalName =
      item.filename ||
      fileInfo.name ||
      `${item.fileId}.${fileInfo.mimeType === 'application/pdf' ? 'pdf' : 'bin'}`;

    const safeName = this.getUniqueName(
      this.appwriteService.sanitizeZipEntryName(originalName),
      usedNames,
    );

    const source = await this.appwriteService.openFileStream(
      item.bucketId,
      item.fileId,
    );

    await new Promise<void>((resolve, reject) => {
      source.once('error', reject);

      archive.append(source, { name: safeName });

      source.once('end', () => resolve());
    });
  }

  private getUniqueName(name: string, usedNames: Set<string>) {
    if (!usedNames.has(name)) {
      usedNames.add(name);
      return name;
    }

    const lastDot = name.lastIndexOf('.');
    const base = lastDot >= 0 ? name.slice(0, lastDot) : name;
    const ext = lastDot >= 0 ? name.slice(lastDot) : '';

    let i = 1;
    let candidate = `${base} (${i})${ext}`;
    while (usedNames.has(candidate)) {
      i++;
      candidate = `${base} (${i})${ext}`;
    }

    usedNames.add(candidate);
    return candidate;
  }

  async streamZipToHttpResponse(
    files: ZipFileItem[],
    zipFilename: string,
    res: Response,
  ) {
    const archive = archiver('zip', {
      zlib: { level: 0 },
    });

    archive.on('warning', (err) => {
      this.logger.warn(`ZIP warning: ${err.message}`);
    });

    archive.on('error', (err) => {
      this.logger.error(`ZIP error: ${err.message}`, err.stack);
      throw err;
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${zipFilename}"`,
    );

    const pipelinePromise = pipeline(archive, res);

    const usedNames = new Set<string>();

    reqAbortSafe(res, archive);

    for (const item of files) {
      await this.appendFileToArchive(archive, item, usedNames);
    }

    await archive.finalize();
    await pipelinePromise;
  }

  async createZipFileOnDisk(files: ZipFileItem[], outputPath: string) {
    await fs.mkdir(dirname(outputPath), { recursive: true });

    const output = createWriteStream(outputPath);

    const archive = archiver('zip', {
      zlib: { level: 0 },
    });

    archive.on('warning', (err) => {
      this.logger.warn(`ZIP warning: ${err.message}`);
    });

    archive.on('error', (err) => {
      this.logger.error(`ZIP error: ${err.message}`, err.stack);
      throw err;
    });

    const pipelinePromise = pipeline(archive, output);
    const usedNames = new Set<string>();

    for (const item of files) {
      await this.appendFileToArchive(archive, item, usedNames);
    }

    await archive.finalize();
    await pipelinePromise;

    const stat = await fs.stat(outputPath);

    return {
      path: outputPath,
      size: stat.size,
    };
  }

  async removeFileIfExists(path: string) {
    try {
      await fs.unlink(path);
    } catch {
      this.logger.warn(`File not found: ${path}`);
    }
  }
}

function reqAbortSafe(res: Response, archive: archiver.Archiver) {
  res.on('close', () => {
    if (!res.writableEnded) {
      archive.abort();
    }
  });
}
