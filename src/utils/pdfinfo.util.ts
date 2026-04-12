import { promisify } from 'node:util';
import { execFile as execFileCb } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const execFile = promisify(execFileCb);

export interface PdfPageCountResponse {
  path: string;
  name: string;
  ext: string;
  pages: number;
  fileSizeBytes?: number;
}

export async function getPdfPageCountFromPath(
  filePath: string,
): Promise<PdfPageCountResponse> {
  await fs.access(filePath);

  const stat = await fs.stat(filePath);
  if (!stat.isFile()) {
    throw new Error('La ruta indicada no corresponde a un archivo');
  }

  const ext = path.extname(filePath).toLowerCase();
  if (ext !== '.pdf') {
    throw new Error('El archivo indicado no es un PDF');
  }

  const { stdout, stderr } = await execFile('pdfinfo', [filePath], {
    maxBuffer: 1024 * 1024,
  });

  const output = `${stdout ?? ''}${stderr ?? ''}`;

  const pagesMatch = output.match(/^Pages:\s+(\d+)$/im);
  const fileSizeMatch = output.match(/^File size:\s+(\d+)\s+bytes$/im);

  if (!pagesMatch) {
    throw new Error(`No fue posible obtener Pages desde pdfinfo.\n${output}`);
  }

  return {
    path: filePath,
    name: path.basename(filePath),
    ext,
    pages: Number(pagesMatch[1]),
    fileSizeBytes: fileSizeMatch ? Number(fileSizeMatch[1]) : undefined,
  };
}
