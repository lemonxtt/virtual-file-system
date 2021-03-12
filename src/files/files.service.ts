import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Folder } from 'src/folders/folder.entity';
import { Repository } from 'typeorm';
import { CreateFileDto } from './dto/file.dto';
import { File } from './file.entity';

@Injectable()
export class FilesService {
  constructor(
    @InjectRepository(File) private filesRepository: Repository<File>,
    @InjectRepository(Folder) private foldersRepository: Repository<Folder>
  ) { }

  async getFiles(): Promise<File[]> {
    return this.filesRepository.find();
  }

  async getFile(id: number): Promise<File[]> {
    return this.filesRepository.find({
      where: [{ id }]
    });
  }

  async createFile(file: CreateFileDto) {
    const { name, folderId } = file
    const isExists = await this.filesRepository.find({
      where: [
        {
          folderId,
          name
        }
      ]
    })
    if (isExists) {
      throw new HttpException("this file name already exists", HttpStatus.BAD_REQUEST)
    }

    const body: Partial<File> = {
      ...file,
      size: name.length,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    return this.filesRepository.save(body).catch(error => {
      console.log(error)
      throw new HttpException(error.message, HttpStatus.FORBIDDEN)
    })
  }

  async updateFile(file: File) {
    return this.filesRepository.save(file)
  }

  async deleteFile(fileId: number) {
    return this.filesRepository.delete(fileId);
  }
}
