import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from 'src/common/errors';
import { Folder, FolderSize } from 'src/folders/folder.entity';
import { File } from 'src/files/file.entity';
import { Repository } from 'typeorm';
import { CommandLineBodyDto } from './dto/command-line.dto';
import { handleError } from 'src/common/functions/handle-error';
import { ILsOptions } from './interface/command-line.interface';

@Injectable()
export class CommandLineService {
  constructor(
    @InjectRepository(File) private filesRepository: Repository<File>,
    @InjectRepository(Folder) private foldersRepository: Repository<Folder>,

  ) { }


  async execute(body: CommandLineBodyDto) {
    const { currentPath, cmd } = body

    if (/^cd\s+/.test(cmd)) {
      return await this.cdCommand(body)
    } else if (/^ls((\s+-l)?(\s+\d+)?)$|^ls((\s+\d+)?(\s+-l)?)$/.test(cmd)) {
      return await this.lsCommand(body)
    } else if (/^cr( +-p)? +("[a-zA-Z0-9 .\/_-]+"|[a-zA-Z0-9 .\/_-]+?)( +"?.+"?)?$/.test(cmd)) {
      return await this.crCommand(body)
    } else {
      handleError('invalid command', ErrorCode.INVALID_CMD)
    }
  }

  async crCommand({ currentPath, cmd }: CommandLineBodyDto) {
    const options = {
      '-p': /^cr( +-p) +("[a-zA-Z0-9 .\/_-]+"|[a-zA-Z0-9 .\/_-]+?)( +"?.+"?)?$/.test(cmd)
    }
    let destinationPath = cmd.match(/^cr( +-p)? +("[a-zA-Z0-9 .\/_-]+"|[a-zA-Z0-9 .\/_-]+?)( +"?.+"?)?$/)[2]
    if (destinationPath.slice(0, 2) === './') {
      destinationPath = destinationPath.substring(2) // remove first 2 characters
    }
    // const destinationName = destinationPath.match(/([a-zA-Z0-9 _-]+)\/?$/)[0]
    const fileData = cmd.match(/^^cr( +-p)? +("[a-zA-Z0-9 .\/_-]+"|[a-zA-Z0-9 .\/_-]+?)( +"?.+"?)?$/)[3]

    const currentFolders = await this.analyzePath(currentPath)
    let currentWorkingFolder = currentFolders.length ? currentFolders[currentFolders.length - 1] : null

    if (currentPath === '/' && destinationPath.includes('..')) {
      handleError("can't back to previous root", ErrorCode.PATH_NOT_EXISTS)
    }
    const folders: Folder[] = []

    let _destinationPath = destinationPath
    let _currentWorkingFolder = currentWorkingFolder
    if (_destinationPath.includes('..')) {
      let lastFolder = currentWorkingFolder
      while (_destinationPath.includes('..')) {
        if (lastFolder.folder) {
          const findLastFolder = await this.foldersRepository.findOne({
            where: {
              id: lastFolder?.folder.id
            },
            relations: ['folder']
          })
          lastFolder = findLastFolder
        } else {
          lastFolder = null
        }

        _destinationPath = _destinationPath.replace(/\.\./, '') // replace 1 time
      }

      folders.push(lastFolder)
      _currentWorkingFolder = lastFolder
    }
    if (_destinationPath === '') {
      handleError(`invalid cr's parameter`, ErrorCode.INVALID_CMD)
    }
    const names = _destinationPath.split('/')
    if (!names.length) {
      handleError("can't identify destination", ErrorCode.DESTINATION_NOT_IDENTIFY)
    }
    if (names[0] === '') names.splice(0, 1)

    for (let i = 0; i < names.length - 1; i++) {
      const folderName = names[i]
      if (folderName === '') continue
      const body = {
        name: folderName,
        ...(
          i === 0
            ? (
              _currentWorkingFolder
                ? {
                  folder: {
                    id: _currentWorkingFolder.id
                  }
                }
                : { folder: null }
            )
            : {
              folder: folders.slice(-1)[0]
                ? {
                  id: folders.slice(-1)[0].id
                }
                : null
            }
        )
      }
      let folder = await this.foldersRepository.findOne({
        where: body,
        relations: ['folder']
      })
      if (!folder) {
        if (!options['-p']) {
          handleError(`the path ${folderName} doesn't exists`, ErrorCode.PATH_NOT_EXISTS)
        }
        folder = await this.foldersRepository.save(body)
      }
      folders.push(folder)
    }
    const newFolderName = names.slice(-1)[0]
    const body = {
      name: newFolderName,
      folder: names.length === 1 ? _currentWorkingFolder : folders.slice(-1)[0]
    }
    if (fileData) { // file
      const findFileExist = await this.filesRepository.findOne(body)
      if (findFileExist) {
        handleError("this destination file already exists", ErrorCode.FILE_ALREADY_EXISTS)
      }
      return await this.filesRepository.save({
        ...body,
        value: fileData,
        size: fileData.length
      })
    } else { // folder
      const findFolderExist = await this.foldersRepository.findOne(body)
      if (findFolderExist) {
        handleError("this destination folder already exists", ErrorCode.FOLDER_ALREADY_EXISTS)
      }
      return await this.foldersRepository.save(body)
    }
  }

  async lsCommand({ currentPath, cmd }: CommandLineBodyDto) {
    const options: ILsOptions = {
      "-l": /^ls((\s+-l)(\s+\d+)?)$|^ls((\s+\d+)?(\s+-l))$/.test(cmd),
      "level": /^ls((\s+-l)?(\s+\d+))$|^ls((\s+\d+)(\s+-l)?)$/.test(cmd)
        ? Number(cmd.match(/\d+/)[0])
        : 1
    }
    const currentFolders = await this.analyzePath(currentPath)
    let currentWorkingFolder = currentFolders.length && currentFolders[currentFolders.length - 1]

    currentWorkingFolder = currentWorkingFolder
      ? await this.foldersRepository.findOne({
        where: {
          id: currentWorkingFolder?.id
        },
        relations: ["folders", "files"],
        select: options['-l']
          ? ['createdAt', 'updatedAt', 'name', 'id']
          : ['id', 'name']
      })
      : {
        id: null,
        name: 'root',
        folders: await this.foldersRepository.find({
          where: {
            folder: null
          },
          relations: ["folders", "files"],
          select: options['-l']
            ? ['createdAt', 'updatedAt', 'name', 'id']
            : ['id', 'name']
        }),
        files: await this.filesRepository.find({
          where: {
            folder: null
          },
          select: options['-l']
            ? ['id', 'createdAt', 'updatedAt', 'name', 'size']
            : ['id', 'name', 'size']
        })
      } as Folder
    return this.calculateSizeDepth(currentWorkingFolder, options, 1)
  }

  async cdCommand({ currentPath, cmd }: CommandLineBodyDto) {
    const currentFolders = await this.analyzePath(currentPath)
    const currentWorkingFolder = currentFolders.length && currentFolders[currentFolders.length - 1]

    if (!/^cd\s+[a-zA-Z0-9 .\/_-]+$/.test(cmd)) {
      handleError('invalid cd command', ErrorCode.INVALID_CMD)
    }
    let destinationPath = cmd.match(/^cd\s+([a-zA-Z0-9 .\/_-]+)$/)[1]
    if (destinationPath.slice(0, 2) === './') {
      destinationPath = destinationPath.substring(2) // remove first 2 characters`
    }
    const destinationFolders = await this.analyzePath(
      destinationPath,
      destinationPath.slice(0, 1) !== '/' && currentWorkingFolder
    )
    const firstFolderInDestination = destinationFolders[0]

    if (/^\/[a-zA-Z0-9 _-]+/.test(destinationPath)) { // e.g. /a/b/c, don't care current folder, cd from root
      if (firstFolderInDestination.folder) {
        handleError("the destination doesn't exists", ErrorCode.PATH_NOT_EXISTS)
      }
      return {
        newWorkingFolder: this.generatePathFromArray(destinationFolders)
      }
    } else if (/^(?:\.\/)?[a-zA-Z0-9 _-]+/.test(destinationPath)) { // e.g. a/b/c, cd from current folder to anywhere
      if (firstFolderInDestination.folder?.id !== currentWorkingFolder.id) {
        handleError(`${firstFolderInDestination.name} doesn't belong to current folder`, ErrorCode.NOT_BELONG_TO)
      }
      return {
        newWorkingFolder: this.concatPath(currentFolders, destinationFolders)
      }
    } else if (/^(\.\.\/|\.\.)+[a-zA-Z0-9 _-]*/.test(destinationPath)) { // e.g. ../a/b, cd from previous current folder
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
                  folder: folders.slice(-1)[0]
                    ? {
                      id: folders.slice(-1)[0].id
                    }
                    : null
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

  async calculateSizeDepth(folder: Folder, options: ILsOptions, currentLevel: number): Promise<FolderSize | Folder> {
    const isDetail = options['-l']
    const totalFileSize = isDetail
      ? folder.files.reduce((totalSize, file) => totalSize + file.size, 0)
      : 0
    if (!folder.folders?.length && isDetail) {
      return {
        ...folder,
        size: totalFileSize
      }
    }
    const childFolders = await this.foldersRepository.find({
      where: {
        folder: {
          id: folder.id
        }
      },
      relations: ['folders', 'files'],
      select: isDetail
        ? ['createdAt', 'updatedAt', 'name', 'id']
        : ['id', 'name']
    })
    const childFolderSizes = await Promise.all(
      childFolders.map(childFolder => {
        if (isDetail || currentLevel + 1 < options.level) {
          return this.calculateSizeDepth(childFolder, options, currentLevel + 1)
        }
        return childFolder
      })
    )
    const totalFolderSize = isDetail
      ? childFolderSizes.reduce((totalSize, childFolder) => totalSize + (childFolder as FolderSize).size, 0)
      : 0
    return {
      ...folder,
      folders: currentLevel < options.level
        ? childFolderSizes
        : childFolderSizes.map(childFolderSize => {
          delete childFolderSize.folders
          delete childFolderSize.files
          return childFolderSize
        }),
      ...(
        isDetail
          ? {
            size: totalFileSize + totalFolderSize
          }
          : {}
      )
    }
  }
}
