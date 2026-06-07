import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AppwriteService } from './appwrite.service';
import { Models } from 'node-appwrite';
import ResourceToken = Models.ResourceToken;
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';

@UseGuards(AuthGuard, RolesGuard)
@Roles('admin', 'operador', 'consulta')
@Controller('appwrite')
export class AppwriteController {
  constructor(private readonly appwriteService: AppwriteService) {}

  @Get('descargar-archivo/:bucketId/:fileId')
  async downloadFile(
    @CurrentUser() user: AuthUser,
    @Param('bucketId') bucketId: string,
    @Param('fileId') fileId: string,
  ): Promise<ResourceToken> {
    return await this.appwriteService.generateFileToken(
      bucketId,
      fileId,
      user.email,
    );
  }
}
