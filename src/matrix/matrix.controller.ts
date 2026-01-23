import {
  BadRequestException,
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MatrixService } from './matrix.service';
import type { Express } from 'express';
import {
  UserJwt,
  UserCookie,
} from '../common/decorators/user-cookie.decorator';

@Controller('matrix')
export class MatrixController {
  constructor(private readonly matrixService: MatrixService) {}

  @Post('excel/headers')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
      fileFilter: (req, file, cb) => {
        const allowedMime = new Set([
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
          'application/vnd.ms-excel', // .xls
        ]);

        if (!allowedMime.has(file.mimetype)) {
          return cb(
            new BadRequestException(
              'Archivo no válido. Sube un Excel (.xlsx o .xls).',
            ) as any,
            false,
          );
        }

        cb(null, true);
      },
    }),
  )
  getExcelHeaders(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException(
        'No se recibió archivo. Usa form-data con key "file".',
      );
    }

    const headers = this.matrixService.getExcelHeadersFromBuffer(file.buffer);
    return { headers };
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
      fileFilter: (req, file, cb) => {
        const allowedMime = new Set([
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
          'application/vnd.ms-excel', // .xls
        ]);

        if (!allowedMime.has(file.mimetype)) {
          return cb(
            new BadRequestException(
              'Archivo no válido. Sube un Excel (.xlsx o .xls).',
            ) as any,
            false,
          );
        }

        cb(null, true);
      },
    }),
  )
  createMatrix(
    @UploadedFile() file: Express.Multer.File,
    @UserJwt() jwt: string,
    @UserCookie() user: string,
    @Body() data: Record<string, any>,
  ) {
    if (!file) {
      throw new BadRequestException(
        'No se recibió archivo. Usa form-data con key "file".',
      );
    }

    return this.matrixService.createMatrix(data, file, user, jwt);
  }

  @Put()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
      fileFilter: (req, file, cb) => {
        const allowedMime = new Set([
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
          'application/vnd.ms-excel', // .xls
        ]);

        if (!allowedMime.has(file.mimetype)) {
          return cb(
            new BadRequestException(
              'Archivo no válido. Sube un Excel (.xlsx o .xls).',
            ) as any,
            false,
          );
        }

        cb(null, true);
      },
    }),
  )
  updateMatrix(
    @UploadedFile() file: Express.Multer.File,
    @Param('id', ParseIntPipe) id: number,
    @UserJwt() jwt: string,
    @UserCookie() user: string,
    @Body() data: Record<string, any>,
  ) {
    return this.matrixService.updateMatrix(id, data, user, file);
  }
}
