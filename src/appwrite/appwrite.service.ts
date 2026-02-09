import { ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { Client, Users, ID, Models, Query, Storage } from 'node-appwrite'; // Importamos Query y Models
import { InputFile } from 'node-appwrite/file';
import { DRIZZLE } from '../database/database.module';
import { MySql2Database } from 'drizzle-orm/mysql2';
import * as schema from '../../drizzle/schema';
import { eq, sql } from 'drizzle-orm';
import { EventosService } from '../eventos/eventos.service';

@Injectable()
export class AppwriteService {
  private readonly logger = new Logger(AppwriteService.name);
  private client: Client;
  private users: Users;
  private storage: Storage;

  constructor(
    @Inject(DRIZZLE) private db: MySql2Database<typeof schema>,
    private readonly eventosService: EventosService,
  ) {
    this.logger.log('Initializing Appwrite service...');
    this.logger.log('PROJECT_ID: ' + process.env.APPWRITE_PROJECT_ID);

    this.client = new Client()
      .setEndpoint(
        process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
      )
      .setProject(<string>process.env.APPWRITE_PROJECT_ID)
      .setKey(<string>process.env.APPWRITE_API_KEY);

    this.users = new Users(this.client);
    this.storage = new Storage(this.client);
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

  async updateUserLabel(userId: string, label: string[]) {
    try {
      await this.users.updateLabels(userId, label);
    } catch (error) {
      this.logger.error(`Error updating user label: ${error.message}`);
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

  //STORAGE TASKS
  async createBucketId(
    name: string,
    bucketId: string = ID.unique(),
  ): Promise<string> {
    try {
      const bucket = await this.storage.createBucket(
        bucketId,
        name,
        // permissions (opcional) - si no pasas nada, Appwrite aplica defaults del proyecto
        // [],
        // fileSecurity (opcional)
        // false,
        // enabled (opcional)
        // true,
        // maximumFileSize (opcional)
        // undefined,
        // allowedFileExtensions (opcional)
        // undefined,
        // compression (opcional)
        // undefined,
        // encryption (opcional)
        // undefined,
        // antivirus (opcional)
        // undefined,
      );

      return bucket.$id;
    } catch (error: any) {
      // Si el bucketId ya existe
      if (error?.code === 409) {
        this.logger.warn(`Bucket ya existe: ${bucketId}`);
        return bucketId;
      }

      this.logger.error(
        `Error creating bucket: ${error?.message ?? 'Unknown error'}`,
      );
      throw error;
    }
  }

  async uploadFile(
    file: Buffer,
    filename: string,
    bucketId: string,
    mimeType?: string,
    fileId?: string,
  ) {
    try {
      const inputFile = InputFile.fromBuffer(file, filename);

      const response = await this.storage.createFile(
        bucketId,
        fileId || ID.unique(),
        inputFile,
      );

      this.logger.log(`File uploaded successfully: ${response.$id}`);
      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error uploading file: ${errorMessage}`, errorStack);
      throw error;
    }
  }
  async getFileForDownload(
    bucketId: string,
    fileId: string,
    user: string,
  ): Promise<{
    buffer: Buffer;
    filename: string;
    mimeType: string;
  }> {
    try {
      // Primero obtenemos la metadata del archivo
      const fileInfo = await this.storage.getFile(bucketId, fileId);

      // Luego obtenemos el contenido del archivo
      const fileContent = await this.storage.getFileDownload(bucketId, fileId);
      const [policie] = await this.db
        .select()
        .from(schema.archivoMetadata)
        .innerJoin(
          schema.poliza,
          eq(schema.archivoMetadata.id, schema.poliza.idarchivoMetadata),
        )
        .where(eq(schema.archivoMetadata.fileId, fileId));

      let idpoliza = 0;
      if (user !== 'SYSTEM') {
        if (policie) {
          idpoliza = policie.poliza.id;
        }
        await this.eventosService.logEvent(
          {
            idcTipoAccion: 2,
            idpoliza: idpoliza,
            usuario: user,
          },
          user,
        );
      }
      return {
        buffer: Buffer.from(fileContent),
        filename: fileInfo.name,
        mimeType: fileInfo.mimeType,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Error downloading file: ${errorMessage}`, errorStack);
      throw error;
    }
  }
}
