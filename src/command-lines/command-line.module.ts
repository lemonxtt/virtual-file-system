import { Module } from '@nestjs/common';
import { CommandLineService } from './command-line.service';
import { CommandLineController } from './command-line.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Folder } from 'src/folders/folder.entity';
import { File } from 'src/files/file.entity';
import { FilesModule } from 'src/files/files.module';
import { FoldersModule } from 'src/folders/folders.module';

@Module({
  imports: [TypeOrmModule.forFeature([File, Folder]), FilesModule, FoldersModule],
  providers: [CommandLineService],
  controllers: [CommandLineController],
  exports: [CommandLineService]
})
export class CommandLineModule {}
