import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FilesModule } from './files/files.module';
import { FoldersModule } from './folders/folders.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      autoLoadEntities: true,
    }),
    FilesModule,
    FoldersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
