import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from 'src/common/errors';
import { Folder } from 'src/folders/folder.entity';
import { File } from 'src/files/file.entity';
import { Repository } from 'typeorm';
import { CommandLineBodyDto } from './dto/command-line.dto';
import { handleError } from 'src/common/functions/handle-error';

@Injectable()
export class CommandLineService {
  constructor(
    @InjectRepository(File) private filesRepository: Repository<File>,
    @InjectRepository(Folder) private foldersRepository: Repository<Folder>,

  ) { }


  async execute(body: CommandLineBodyDto) {
    const { currentPath, cmd } = body
    this.validateCMD(cmd)

    if (/^cd\s+/.test(cmd)) { // cd
      return await this.cdCommand(body)
    } else {
      handleError('invalid command', ErrorCode.INVALID_CMD)
    }
  }

  async cdCommand({ currentPath, cmd }: CommandLineBodyDto) {
    const currentFolders = await this.analyzePath(currentPath)
    const currentWorkingFolder = currentFolders.length && currentFolders[currentFolders.length - 1]

    if (!/^cd\s+[a-zA-Z0-9 .\/_-]+$/.test(cmd)) {
      handleError('invalid cd command', ErrorCode.INVALID_CMD)
    }
    let destinationPath = cmd.match(/^cd\s+([a-zA-Z0-9 .\/_-]+)$/)[1]
    if (destinationPath.slice(0, 2) === './') {
      destinationPath = destinationPath.substring(2)
    }
    const destinationFolders = await this.analyzePath(
      destinationPath,
      destinationPath.slice(0, 1) !== '/' && currentWorkingFolder
    )
    const firstFolderInDestination = destinationFolders[0]

    if (/^\/[a-zA-Z0-9 _-]+/.test(destinationPath)) { // eg: /a/b/c, don't care current folder, cd from root
      if (firstFolderInDestination.folder) {
        handleError("the destination doesn't exists", ErrorCode.PATH_NOT_EXISTS)
      }
      return {
        newWorkingFolder: this.generatePathFromArray(destinationFolders)
      }
    } else if (/^(?:\.\/)?[a-zA-Z0-9 _-]+/.test(destinationPath)) { // eg: a/b/c, cd from current folder to anywhere
      if (firstFolderInDestination.folder?.id !== currentWorkingFolder.id) {
        handleError(`${firstFolderInDestination.name} doesn't belong to current folder`, ErrorCode.NOT_BELONG_TO)
      }
      return {
        newWorkingFolder: this.concatPath(currentFolders, destinationFolders)
      }
    } else if (/^(\.\.\/|\.\.)+[a-zA-Z0-9 _-]*/.test(destinationPath)) { // eg: ../a/b, cd from previous current folder
      if (!currentWorkingFolder) {
        handleError("can't find ../ from current folder", ErrorCode.PATH_NOT_EXISTS)
      }
      const amountDoubleDot = destinationPath.match(/\.\./g)?.length + 1
      return {
        newWorkingFolder: this.concatPath(currentFolders.slice(0, currentFolders.length - amountDoubleDot), destinationFolders)
      }
    } else {
      handleError("invalid cd command", ErrorCode.INVALID_CMD)
    }
  }

  validateCMD(cmd: string) {
    if (/^cd\s+[a-zA-Z0-9 .\/_-]+$/.test(cmd)) {

    } else {
      handleError("invalid cmd", ErrorCode.INVALID_CMD)
    }
  }

  async analyzePath(path: string, currentFolder?: Folder) {
    if (!currentFolder && path.includes('..')) {
      handleError("can't back to previous root", ErrorCode.PATH_NOT_EXISTS)
    }
    const folders: Folder[] = []

    let _path = path
    let _currentFolder = currentFolder
    if (_path.includes('..')) {
      let lastFolder = currentFolder
      while (_path.includes('..')) {
        const findLastFolder = await this.foldersRepository.findOne({
          where: {
            id: lastFolder.folder.id
          },
          relations: ['folder']
        })
        lastFolder = findLastFolder

        _path = _path.replace(/\.\./, '') // replace 1 time
      }
      folders.push(lastFolder)
      _currentFolder = lastFolder
    }
    if (_path === '') return folders
    const folderNames = _path.split('/')
    if (!folderNames.length) return folders
    if (folderNames.length) {
      if (folderNames[0] === '') folderNames.splice(0, 1)

      for (let i = 0; i < folderNames.length; i++) {
        const folderName = folderNames[i]
        if (folderName === '') continue
        const folder = await this.foldersRepository.findOne({
          where: {
            name: folderName,
            ...(
              i === 0
                ? (
                  _currentFolder
                    ? {
                      folder: {
                        id: _currentFolder.id
                      }
                    }
                    : { folder: null }
                )
                : {
                  folder: {
                    id: folders.slice(-1)[0].id
                  }
                }
            )
          },
          relations: ['folder']
        })
        if (!folder) {
          handleError(`the path ${folderName} doesn't exists`, ErrorCode.PATH_NOT_EXISTS)
        }
        folders.push(folder)
      }
    }
    return folders
  }

  generatePathFromArray(folders: Folder[]) {
    let index = 0
    while (index !== folders.length) {
      if (folders[index] === null) {
        folders.splice(index - 1, 2)
        index
      } else {
        index++
      }
    }
    if (!folders?.length) return '/'
    for (let i = folders.length - 1; i > 0; i--) {
      if (folders[i].folder?.id !== folders[i - 1].id) {
        handleError("the destination is invalid", ErrorCode.PATH_NOT_EXISTS)
      }
    }
    let path = folders.reduce((path, folder) => path + folder.name + '/', '/')
    while (path.includes('..')) {
      path = path.replace(/[a-zA-Z0-9 _-]+\/\.\./, '')
    }
    return path
  }

  concatPath(folders: Folder[], _folders: Folder[]) {
    return this.generatePathFromArray(folders.concat(_folders))
  }
}
