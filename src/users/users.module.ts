import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AppwriteModule } from 'src/appwrite/appwrite.module';
import { AppwriteService } from '../appwrite/appwrite.service';
import { EventosService } from '../eventos/eventos.service';

@Module({
  imports: [AppwriteModule],
  controllers: [UsersController],
  providers: [UsersService, AppwriteService, EventosService],
})
export class UsersModule {}
