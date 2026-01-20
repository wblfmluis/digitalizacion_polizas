import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { Client, Users, ID, Models, Query } from 'node-appwrite'; // Importamos Query y Models

@Injectable()
export class AppwriteService {
  private readonly logger = new Logger(AppwriteService.name);
  private client: Client;
  private users: Users;

  constructor() {
    this.logger.log('Initializing Appwrite service...');
    this.logger.log('PROJECT_ID: ' + process.env.APPWRITE_PROJECT_ID);

    this.client = new Client()
      .setEndpoint(
        process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
      )
      .setProject(<string>process.env.APPWRITE_PROJECT_ID)
      .setKey(<string>process.env.APPWRITE_API_KEY);

    this.users = new Users(this.client);
    this.logger.log('Appwrite service initialized');
  }

  // Crear un nuevo usuario
  async createUser(
    email: string,
    password: string,
    name?: string,
  ): Promise<Models.User<Models.Preferences>> {
    try {
      return await this.users.create(
        ID.unique(),
        email,
        undefined, // phone
        password,
        name || email,
      );
    } catch (error) {
      if (error.code === 409) {
        throw new ConflictException({
          message: 'El usuario con este email ya existe',
        });
      }
      this.logger.error(`Error creating user: ${error.message}`);
      throw error;
    }
  }

  // Obtener un usuario por su ID
  async getUserById(userId: string): Promise<Models.User<Models.Preferences>> {
    try {
      return await this.users.get(userId);
    } catch (error) {
      this.logger.error(`Error fetching user ${userId}: ${error.message}`);
      throw error;
    }
  }

  // Listar usuarios (con búsqueda opcional)
  async listUsers(
    search?: string,
  ): Promise<Models.UserList<Models.Preferences>> {
    try {
      // Usamos Query.search para buscar por nombre, email, etc.
      const queries = search ? [Query.search('email', search)] : [];
      return await this.users.list(queries);
    } catch (error) {
      this.logger.error(`Error listing users: ${error.message}`);
      throw error;
    }
  }

  // Eliminar un usuario
  async deleteUser(userId: string): Promise<{ success: boolean }> {
    try {
      await this.users.delete(userId);
      return { success: true };
    } catch (error) {
      this.logger.error(`Error deleting user ${userId}: ${error.message}`);
      throw error;
    }
  }
}
