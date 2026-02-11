import { Controller, Get, Param } from '@nestjs/common';
import { AppwriteService } from './appwrite.service';
import { UserCookie } from '../common/decorators/user-cookie.decorator';
import { Models } from 'node-appwrite';
import ResourceToken = Models.ResourceToken;

@Controller('appwrite')
export class AppwriteController {
  constructor(private readonly appwriteService: AppwriteService) {}

  @Get('descargar-archivo/:bucketId/:fileId')
  async downloadFile(
    @UserCookie() user: string,
    @Param('bucketId') bucketId: string,
    @Param('fileId') fileId: string,
  ): Promise<ResourceToken> {
    return await this.appwriteService.generateFileToken(bucketId, fileId);
  }
}
