import { Controller, Delete, Get, Param, Post, Request } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('user')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll(): Promise<Record<string, any>> {
    return await this.usersService.findAll();
  }

  @Post()
  async createUser(@Request() req: any): Promise<string> {
    const { email, password } = req.body;
    return await this.usersService.createUser(email, password);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return await this.usersService.remove(id);
  }
}
