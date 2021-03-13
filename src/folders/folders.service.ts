import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from 'src/common/errors';
import { Repository } from 'typeorm';
import { CreateFolderDto } from './dto/folder.dto';
import { Folder } from './folder.entity';

@Injectable()
export class FoldersService {
  constructor(@InjectRepository(Folder) private foldersRepository: Repository<Folder>) { }

  async getFolders(): Promise<Folder[]> {
    return this.foldersRepository.find();
  }

  async getFolder(_id: number): Promise<Folder[]> {
    return this.foldersRepository.find({
      where: [{ "id": _id }]
    });
  }

  async createFolder(folder: CreateFolderDto) {
    const { name, folderId } = folder
    const [isExists, parentFolder] = await Promise.all([
      this.foldersRepository.findOne({
        where: {
          name,
          ...(folderId ? {
            folder: {
              id: folderId
            },
          } : {}
          ),
        }
      }),
      folderId
      ? this.foldersRepository.findOne({
        where: { id: folderId }
      })
      : null
    ])
    if (isExists) {
      throw new HttpException("this folder name already exists", ErrorCode.FOLDER_ALREADY_EXISTS)
    }
    const body: Partial<Folder> = {
      name
    }
    const newFolder = this.foldersRepository.create(body)
    if (folderId) {
      newFolder.folder = parentFolder
    }
    return this.foldersRepository.save(newFolder).catch(error => {
      console.log(error)
      throw new HttpException(error.message, HttpStatus.FORBIDDEN)
    })
  }

  async updateFolder(folder: Folder) {
    return this.foldersRepository.save(folder)
  }

  async deleteFolder(folderId: number) {
    return this.foldersRepository.delete(folderId);
  }

}
