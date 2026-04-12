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
} from '@nestjs/common';
import { PoliciesService } from './policies.service';
import {
  UserJwt,
  UserCookie,
} from '../common/decorators/user-cookie.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express, Response } from 'express';
import path from 'node:path';
import * as fs from 'node:fs';
import { diskStorage } from 'multer';

@Controller('policies')
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  @Get()
  async getPolicies(
    @UserCookie() user: string,
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
      user,
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
          const safeBase = base
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_+|_+$/g, '');

          cb(null, `${safeBase}-${Date.now()}${ext}`);
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
    @UserJwt() jwt: string,
    @UserCookie() user: string,
  ) {
    if (!file) {
      throw new BadRequestException(
        'No se recibió archivo. Usa form-data con key "file".',
      );
    }
    return this.policiesService.uploadPolicieFile(file, user, jwt);
  }

  @Get('/:id')
  async policieDetail(@Param('id') id: number, @UserCookie() user: string) {
    return this.policiesService.policieDetail(id, user);
  }

  @Post('files/zip')
  async downloadZipByFileIds(
    @Body('fileIds') fileIds: string[],
    @Res() res: Response,
    @UserCookie() user: string,
  ) {
    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      throw new BadRequestException('fileIds debe ser un arreglo no vacío');
    }
    return this.policiesService.streamZipFromAppwriteFileIds(
      fileIds,
      res,
      user,
    );
  }
}
