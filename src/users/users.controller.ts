import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser, RoleKey } from '../auth/types/auth-user.type';

@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
@Controller('user')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll() {
    return await this.usersService.findAll();
  }

  @Post()
  async createUser(@Body() body: any, @CurrentUser() user: AuthUser) {
    return await this.usersService.createUser(body, user);
  }

  @Put(':id')
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @CurrentUser() user: AuthUser,
  ) {
    return await this.usersService.updateUser(id, body, user);
  }

  @Put(':id/password')
  async updatePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body('password') password: string,
    @CurrentUser() user: AuthUser,
  ) {
    return await this.usersService.updatePassword(id, password, user);
  }

  @Put(':id/roles')
  async updateRoles(
    @Param('id', ParseIntPipe) id: number,
    @Body('roles') roles: RoleKey[],
  ) {
    return await this.usersService.updateRoles(id, roles);
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return await this.usersService.remove(id, user);
  }
}
