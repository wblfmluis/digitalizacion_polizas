import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MatrixService } from './matrix.service';
import type { Express } from 'express';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';

@UseGuards(AuthGuard, RolesGuard)
@Controller('matrix')
export class MatrixController {
  constructor(private readonly matrixService: MatrixService) {}

  @Post('excel/headers')
  @Roles('admin', 'operador')
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
  @Roles('admin', 'operador')
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
    @CurrentUser() user: AuthUser,
    @Body() data: Record<string, any>,
  ) {
    if (!file) {
      throw new BadRequestException(
        'No se recibió archivo. Usa form-data con key "file".',
      );
    }

    return this.matrixService.createMatrix(data, file, user.email, '');
  }

  @Put('/:id')
  @Roles('admin', 'operador')
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
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
    @Body() data: Record<string, any>,
  ) {
    return this.matrixService.updateMatrix(id, data, user.email);
  }

  @Get('procesar-polizas/:id')
  @Roles('admin', 'operador')
  async procesarPolizas(@Param('id', ParseIntPipe) id: number) {
    return this.matrixService.procesar_polizas(id);
  }

  @Get('/:id')
  @Roles('admin', 'operador', 'consulta')
  async getMatrixById(@Param('id', ParseIntPipe) id: number) {
    return this.matrixService.getMatrixById(id);
  }

  @Get()
  @Roles('admin', 'operador', 'consulta')
  async getMatrix(@CurrentUser() user: AuthUser) {
    return this.matrixService.getMatrix(user.email);
  }

  @Delete('/:id')
  @Roles('admin')
  async deleteMatrix(@Param('id', ParseIntPipe) id: number) {
    return this.matrixService.deleteMatriz(id);
  }
}
