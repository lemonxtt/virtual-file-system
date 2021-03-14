import { Module } from '@nestjs/common';
import { FoldersService } from './folders.service';
import { FoldersController } from './folders.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Folder } from './folder.entity';
import { File } from '../files/file.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Folder, File])],
  providers: [FoldersService],
  controllers: [FoldersController],
  exports: [FoldersService]
})
export class FoldersModule {}
