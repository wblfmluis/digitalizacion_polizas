import {
  BadRequestException,
  Controller,
  Get,
  ParseIntPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { PoliciesService } from './policies.service';
import {
  UserJwt,
  UserCookie,
} from '../common/decorators/user-cookie.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';

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
  ) {
    return this.policiesService.getPolicies(
      {
        page: page,
        pageSize: pageSize,
        offset: offset,
        idejercicio: idejercicio,
        idmatriz: idmatriz,
        archivo: archivo,
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
      limits: { fileSize: 100 * 1024 * 1024 }, // 10 MB
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
}
