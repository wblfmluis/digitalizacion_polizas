import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  Body,
  Res,
  UseGuards,
} from '@nestjs/common';
import { PoliciesService } from './policies.service';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express, Response } from 'express';
import path from 'node:path';
import * as fs from 'node:fs';
import { diskStorage } from 'multer';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';

@UseGuards(AuthGuard, RolesGuard)
@Roles('admin', 'operador', 'consulta')
@Controller('policies')
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Get()
  async getPolicies(
    @CurrentUser() user: AuthUser,
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
    @Query('offset') offset: string,
    @Query('idejercicio') idejercicio?: string,
    @Query('idmatriz') idmatriz?: string,
    @Query('archivo') archivo?: string,
    @Query('busqueda') q?: string,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
  ) {
    return this.policiesService.getPolicies(
      {
        page: page,
        pageSize: pageSize,
        offset: offset,
        idejercicio: idejercicio,
        idmatriz: idmatriz,
        archivo: archivo,
        q: q,
        fechaInicio: fechaInicio,
        fechaFin: fechaFin,
      },
      user.email,
    );
  }

  @Get('stats')
  async getPoliciesStats(
    @Query('idejercicio') idejercicio?: string,
    @Query('idmatriz') idmatriz?: string,
    @Query('fechaFrom') fechaFrom?: string,
    @Query('fechaTo') fechaTo?: string,
  ) {
    return this.policiesService.getPolizasStats({
      idejercicio,
      idmatriz,
      fechaFrom,
      fechaTo,
    });
  }

  @Post('file')
  @Roles('admin', 'operador')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const tempDir = process.env.TEMP_DIR ?? '/app/temp/uploads';
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }
          cb(null, tempDir);
        },
        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname);
          const base = path.basename(file.originalname, ext);
          const safeBase = base;
          /*
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_+|_+$/g, '');

             */

          cb(null, `${safeBase}${ext}`);
        },
      }),
      limits: { fileSize: 5000 * 1024 * 1024 },
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
  uploadPolicieFile(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file) {
      throw new BadRequestException(
        'No se recibió archivo. Usa form-data con key "file".',
      );
    }
    return this.policiesService.uploadPolicieFile(file, user.email, '');
  }

  @Get('/:id')
  async policieDetail(@Param('id') id: number, @CurrentUser() user: AuthUser) {
    return this.policiesService.policieDetail(id, user.email);
  }

  @Post('files/zip')
  async downloadZipByFileIds(
    @Body('fileIds') fileIds: string[],
    @Res() res: Response,
    @CurrentUser() user: AuthUser,
  ) {
    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      throw new BadRequestException('fileIds debe ser un arreglo no vacío');
    }
    return this.policiesService.streamZipFromAppwriteFileIds(
      fileIds,
      res,
      user.email,
    );
  }
}
