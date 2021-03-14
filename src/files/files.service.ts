import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from 'src/common/errors';
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

  async getFile(id: number): Promise<File> {
    return this.filesRepository.findOne(id)
  }

  async createFile(file: CreateFileDto) {
    const { name, folderId, value } = file
    const [isExists, folder] = await Promise.all([
      this.filesRepository.findOne({
        ...(folderId ? {
          folder: {
            id: folderId
          },
        } : {}
        ),
        name
      }),
      folderId
        ? this.foldersRepository.findOne(folderId)
        : null
    ])
    if (isExists) {
      throw new HttpException("this file already exists", ErrorCode.FILE_ALREADY_EXISTS)
    }

    const newFile = this.filesRepository.create({
      ...file,
      size: value.length
    })
    if (folderId) newFile.folder = folder
    return this.filesRepository.save(newFile).catch(error => {
      console.log(error)
      throw new HttpException(error.message, HttpStatus.FORBIDDEN)
    })
  }

  async updateFile(file: Partial<File>) {
    return this.filesRepository.update(file.id, file)
  }

  async deleteFile(fileId: number) {
    return this.filesRepository.delete(fileId);
  }
}
