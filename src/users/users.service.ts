import { Injectable, Logger } from '@nestjs/common';
import { AppwriteService } from '../appwrite/appwrite.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly appwrite: AppwriteService) {}

  async createUser(email: string, password: string): Promise<string> {
    const response = await this.appwrite.createUser(email, password);
    return response.$id;
  }

  async findOne(userId: string) {
    return await this.appwrite.getUserById(userId);
  }

  async remove(userId: string) {
    return await this.appwrite.deleteUser(userId);
  }

  async findAll() {
    return await this.appwrite.listUsers();
  }
}
