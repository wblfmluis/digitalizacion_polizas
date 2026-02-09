import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { AppwriteService } from '../appwrite/appwrite.service';

@Controller('user')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly appwriteService: AppwriteService,
  ) {}

  @Get()
  async findAll(): Promise<Record<string, any>> {
    return await this.usersService.findAll();
  }

  @Post()
  async createUser(@Request() req: any): Promise<Record<string, any>> {
    const { email, password } = req.body;
    return await this.usersService.createUser(email, password);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.usersService.remove(id);
  }

  @Post(':id/label')
  async updateUserLabel(@Param('id') userId: string, @Request() req: any) {
    const { label } = req.body;
    if (!Array.isArray(label)) {
      throw new BadRequestException({
        message: 'label debe ser un array',
      });
    }
    return await this.appwriteService.updateUserLabel(userId, label);
  }
}
