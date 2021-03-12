import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { File } from './file.entity';
import { Folder } from 'src/folders/folder.entity';

@Module({
  imports: [TypeOrmModule.forFeature([File, Folder])],
  providers: [FilesService],
  controllers: [FilesController]
})
export class FilesModule {}
