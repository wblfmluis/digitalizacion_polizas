import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { promises as fs } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { Inject, Logger } from '@nestjs/common';
import { AppwriteService } from '../appwrite/appwrite.service';
import os from 'node:os';
import { DRIZZLE } from '../database/database.module';
import { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

type PdfProfile = 'screen' | 'ebook' | 'printer' | 'prepress';

const ALLOWED_PROFILES = new Set<PdfProfile>([
  'screen',
  'ebook',
  'printer',
  'prepress',
]);

function normalizeProfile(input: unknown): PdfProfile {
  if (typeof input !== 'string') return 'ebook';
  const value = input.trim().toLowerCase();
  if (ALLOWED_PROFILES.has(value as PdfProfile)) return value as PdfProfile;
  return 'ebook';
}

function getTempBaseDir() {
  const configured = process.env.PDF_OPTIMIZE_TMP_DIR?.trim();
  return configured && configured.length > 0
    ? configured
    : path.join('/tmp', 'dp_backend', 'pdf-optimize');
}

@Processor('pdf-optimize')
export class PdfOptimizeProcessor extends WorkerHost {
  private readonly logger = new Logger(PdfOptimizeProcessor.name);
  constructor(
    private readonly appwrite: AppwriteService,
    @Inject(DRIZZLE) private db: MySql2Database<typeof schema>,
  ) {
    super();
  }

  async process(
    job: Job<{
      archivoMetadataId: number;
      policyId?: number;
      bucketId: string;
      originalFileId: string;
      profile?: unknown;
    }>,
  ) {
    const startedAt = Date.now();

    const { archivoMetadataId, policyId, bucketId, originalFileId } = job.data;

    const p = job.data.profile;
    const profile = normalizeProfile(job.data.profile);

    if (job.data.profile && job.data.profile !== profile) {
      this.logger.warn(
        `Job ${job.id}: profile inválido (${String(p)}) → usando "${profile}"`,
      );
    }

    const tmpDir = getTempBaseDir();
    this.logger.log(
      `Job ${job.id}: START archivoMetadataId=${archivoMetadataId} policyId=${policyId ?? 'n/a'} originalFileId=${originalFileId} profile=${profile} tmpDir=${tmpDir}`,
    );

    const inputPath = path.join(tmpDir, `${originalFileId}.input.pdf`);
    const outputPath = path.join(tmpDir, `${originalFileId}.optimized.pdf`);

    try {
      await fs.mkdir(tmpDir, { recursive: true });

      // Verificación rápida de que el directorio es escribible
      await fs.access(tmpDir);

      await this.db
        .update(schema.archivoMetadata)
        .set({
          fileState: 'PROCESSING',
        })
        .where(eq(schema.archivoMetadata.id, archivoMetadataId));

      const file = await this.appwrite.getFileForDownload(
        bucketId,
        originalFileId,
        'system',
      );

      const inputBuffer = Buffer.isBuffer(file.buffer)
        ? file.buffer
        : Buffer.from(file.buffer);

      await fs.writeFile(inputPath, inputBuffer);

      this.logger.log(
        `Descargado desde Appwrite y escrito a tmp: ${inputPath} (${inputBuffer.length} bytes)`,
      );

      this.logger.debug(`Job ${job.id}: running Ghostscript...`);

      await runGhostscript({
        inputPath,
        outputPath,
        profile,
        timeoutMs: 120_000,
        onStderrChunk: (chunk) => {
          this.logger.debug(`Job ${job.id} gs: ${chunk}`);
        },
      });

      const outStat = await fs.stat(outputPath);
      this.logger.log(`Job ${job.id}: output size=${outStat.size} bytes`);

      if (outStat.size < 1024) {
        throw new Error(
          'Output PDF demasiado pequeño; posible fallo de optimización',
        );
      }

      const durationMs = Date.now() - startedAt;
      const fileBuffer = await fs.readFile(outputPath);

      const [fileMetadata] = await this.db
        .select()
        .from(schema.archivoMetadata)
        .where(eq(schema.archivoMetadata.id, archivoMetadataId))
        .limit(1);

      if (!fileMetadata) {
        throw new Error(
          `File metadata not found for archivoMetadataId: ${archivoMetadataId}`,
        );
      }

      const saveToAppwrite = await this.appwrite.uploadFile(
        fileBuffer,
        fileMetadata.nombre || originalFileId + '.pdf',
        bucketId,
        fileMetadata.mimetype || 'application/pdf',
      );

      await this.db
        .update(schema.archivoMetadata)
        .set({
          fileId: saveToAppwrite.$id,
          optimizedSize: fileBuffer.length,
          fileState: 'OPTIMIZED',
          durationMs: durationMs,
        })
        .where(eq(schema.archivoMetadata.id, archivoMetadataId));

      this.logger.log(
        `Job ${job.id}: OK archivoMetadataId=${archivoMetadataId} optimizedFileId=${saveToAppwrite.$id} durationMs=${durationMs}`,
      );

      return { optimizedFileId: saveToAppwrite.$id };
    } catch (err: any) {
      this.logger.error(
        `Job ${job.id}: FAILED archivoMetadataId=${archivoMetadataId} policyId=${policyId ?? 'n/a'} originalFileId=${originalFileId} error=${err?.message ?? String(err)}`,
        err?.stack,
      );

      await this.db
        .update(schema.archivoMetadata)
        .set({
          fileState: 'UPLOADED',
        })
        .where(eq(schema.archivoMetadata.id, archivoMetadataId));

      throw err;
    } finally {
      await Promise.allSettled([fs.unlink(inputPath), fs.unlink(outputPath)]);
      this.logger.debug(`Job ${job.id}: cleanup done`);
    }
  }
}

function runGhostscript(opts: {
  inputPath: string;
  outputPath: string;
  profile: PdfProfile;
  timeoutMs: number;
  onStderrChunk?: (chunk: string) => void;
}) {
  return new Promise<void>((resolve, reject) => {
    const args = [
      '-sDEVICE=pdfwrite',
      '-dCompatibilityLevel=1.4',
      `-dPDFSETTINGS=/${opts.profile}`,
      '-dNOPAUSE',
      '-dBATCH',
      '-dQUIET',
      `-sOutputFile=${opts.outputPath}`,
      opts.inputPath,
    ];

    const child = spawn('gs', args, { stdio: ['ignore', 'pipe', 'pipe'] });

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`Ghostscript timeout (${opts.timeoutMs}ms)`));
    }, opts.timeoutMs);

    let stderr = '';
    child.stderr.on('data', (d) => {
      const chunk = d.toString();
      stderr += chunk;
      opts.onStderrChunk?.(chunk.slice(0, 500));
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) return resolve();
      reject(
        new Error(
          `Ghostscript exit code ${code}. stderr: ${stderr.slice(0, 2000)}`,
        ),
      );
    });
  });
}
