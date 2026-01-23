import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { AppwriteModule } from './appwrite/appwrite.module';
import { CatalogModule } from './catalog/catalog.module';
import { MatrixModule } from './matrix/matrix.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    UsersModule,
    AppwriteModule,
    CatalogModule,
    MatrixModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
