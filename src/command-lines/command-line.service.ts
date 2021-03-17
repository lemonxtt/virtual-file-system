import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from 'src/common/errors';
import { Folder, FolderSize } from 'src/folders/folder.entity';
import { File } from 'src/files/file.entity';
import { Repository } from 'typeorm';
import { CommandLineBodyDto, CommandLineBodyMore } from './dto/command-line.dto';
import { handleError } from 'src/common/functions/handle-error';
import { ILsOptions } from './interface/command-line.interface';

declare global {
  interface String {
    clean(): string
  }
}

String.prototype.clean = function() {
  return this.replace(/^\.\//, '') // remove ./
             .replace(/(?<=.+)\/$/, '') // remove the last /
}
@Injectable()
export class CommandLineService {
  constructor(
    @InjectRepository(File) private filesRepository: Repository<File>,
    @InjectRepository(Folder) private foldersRepository: Repository<Folder>,

  ) { }


  async execute(body: CommandLineBodyDto) {
    let { currentPath, cmd } = body
    currentPath = currentPath.clean()
    let currentFolders: Folder[]
    try {
      currentFolders = await this.analyzePath(currentPath)
    } catch (error) {
      handleError("current path not exists", ErrorCode.CURRENT_PATH_NOT_EXISTS)
    }
    const currentWorkingFolder = currentFolders.slice(-1)[0] || null
    const newBody = {
      ...body,
      currentFolders,
      currentWorkingFolder
    }
    if (/^cd\s+/.test(cmd)) {
      return await this.cdCommand(newBody)
    } else if (/^ls((\s+-l)?(\s+\d+)?)$|^ls((\s+\d+)?(\s+-l)?)$/.test(cmd)) {
      return await this.lsCommand(newBody)
    } else if (/^cr( +-p)? +("[a-zA-Z0-9 .\/_-]+"|[a-zA-Z0-9 .\/_-]+?)( +"?.+"?)?$/.test(cmd)) {
      return await this.crCommand(newBody)
    } else if (/^rm +[a-zA-Z0-9 *.\/_-]+$/.test(cmd)) {
      return await this.rmCommand(newBody)
    } else if (/^mv +([a-zA-Z0-9 .\/_-]+) +([a-zA-Z0-9 .\/_-]+)$/.test(cmd)) {
      return await this.mvCommand(newBody)
    } else {
      handleError('invalid command', ErrorCode.INVALID_CMD)
    }
  }

  async mvCommand({ currentPath, cmd, currentWorkingFolder, currentFolders }: CommandLineBodyMore) {
    let match = cmd.match(/^mv +([a-zA-Z0-9 .\/_-]+) +([a-zA-Z0-9 .\/_-]+)$/)
    const sourcePath = match[1].clean()
    const destinationPath = match[2].clean()

     if (currentPath === '/' && (destinationPath + sourcePath).includes('..')) {
      handleError("can't back to previous root", ErrorCode.PATH_NOT_EXISTS)
    }  
    const sourceFolders= await this.analyzePath(sourcePath, currentPath.slice(0, 1) !== '/' && currentWorkingFolder)
    
    if (currentPath === '/' && destinationPath.includes('..')) {
      handleError("can't back to previous root", ErrorCode.PATH_NOT_EXISTS)
    }
    const folders: Folder[] = []

    let _destinationPath = destinationPath
    let _currentWorkingFolder = currentWorkingFolder
    if (_destinationPath.includes('..')) {
      let lastFolder = _currentWorkingFolder
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
    const names = _destinationPath.split('/').filter(e => e !== '')
    if (!names.length) {
      handleError("can't identify destination", ErrorCode.DESTINATION_NOT_IDENTIFY)
    }

    for (let i = 0; i < names.length - 1; i++) {
      const folderName = names[i]
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
        handleError(`the path ${folderName} doesn't exists`, ErrorCode.PATH_NOT_EXISTS)
      }
      folders.push(folder)
    }
  }

  async rmCommand({ currentPath, cmd, currentWorkingFolder, currentFolders }: CommandLineBodyMore) {
    let destinationPath = cmd.match(/^rm +([a-zA-Z0-9 *.\/_-]+)$/)[1]
    destinationPath = destinationPath.clean()
    const splitDestinations = destinationPath.split('/')
    const theLastOneInDestination = splitDestinations.pop()
    const parentPath = splitDestinations.join('/')
    const parentFolders = await this.analyzePath(
      parentPath,
      parentPath.slice(0, 1) !== '/' && currentWorkingFolder,
      ["folders", "files"]
    )
    let parentFolder = parentFolders.slice(-1)[0]
    if (!parentFolder) { // root
      parentFolder = {
        name: 'root',
        folders: await this.foldersRepository.find({
          where: {
            folder: null
          },
          relations: ['folder', 'folders', 'files']
        }),
        files: await this.filesRepository.find({
          folder: null
        })
      } as Folder
    }
    if (theLastOneInDestination === '*') {
      return await Promise.all([
        Promise.all(parentFolder.files.map(file => this.filesRepository.remove(file))),
        Promise.all(parentFolder.folders.map(folder => this.removeFolder(folder))),
      ])
    } else {
      const findRemoveFolder = parentFolder.folders.find(folder => folder.name === theLastOneInDestination)
      if (findRemoveFolder) {
        return await this.removeFolder(
          await this.foldersRepository.findOne(findRemoveFolder.id, { relations: ['files', 'folders'] })
        )
      }
      const findRemoveFile = parentFolder.files.find(file => file.name === theLastOneInDestination)
      if (findRemoveFile) {
        return await this.filesRepository.remove(findRemoveFile)
      }
      if (!findRemoveFile && !findRemoveFolder) {
        handleError(`specified file/folder doesn't exists`, ErrorCode.PATH_NOT_EXISTS)
      }
    }
  }

  async removeFolder(folder: Folder) {
    const removePromises: Promise<any>[] = (folder.files || []).map(file => this.filesRepository.remove(file))
    if (folder.folders) {
      const childFolders = await this.foldersRepository.find({
        where: {
          folder: {
            id: folder.id
          }
        },
        relations: ['folders', 'files']
      })
      removePromises.push(
        ...childFolders.map(childFolder => this.removeFolder(childFolder))
      )
    }
    await Promise.all(removePromises)
    await this.foldersRepository.remove(folder)
  }

  async crCommand({ currentPath, cmd, currentWorkingFolder, currentFolders }: CommandLineBodyMore) {
    const options = {
      '-p': /^cr( +-p) +("[a-zA-Z0-9 .\/_-]+"|[a-zA-Z0-9 .\/_-]+?)( +"?.+"?)?$/.test(cmd)
    }
    let destinationPath = cmd.match(/^cr( +-p)? +("[a-zA-Z0-9 .\/_-]+"|[a-zA-Z0-9 .\/_-]+?)( +"?.+"?)?$/)[2].clean()
    // const destinationName = destinationPath.match(/([a-zA-Z0-9 _-]+)\/?$/)[0]
    const fileData = cmd.match(/^^cr( +-p)? +("[a-zA-Z0-9 .\/_-]+"|[a-zA-Z0-9 .\/_-]+?)( +"?.+"?)?$/)[3]

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
    const names = _destinationPath.split('/').filter(e => e !== '')
    if (!names.length) {
      handleError("can't identify destination", ErrorCode.DESTINATION_NOT_IDENTIFY)
    }

    for (let i = 0; i < names.length - 1; i++) {
      const folderName = names[i]
      const body = {
        name: folderName,
        ...(
          i === 0
            ? (
              _destinationPath.slice(0, 1) === '/'
                ? { folder: null }
                : (
                  _currentWorkingFolder
                    ? {
                      folder: {
                        id: _currentWorkingFolder.id
                      }
                    }
                    : { folder: null }
                )
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

  async lsCommand({ currentPath, cmd, currentWorkingFolder, currentFolders }: CommandLineBodyMore) {
    const options: ILsOptions = {
      "-l": /^ls((\s+-l)(\s+\d+)?)$|^ls((\s+\d+)?(\s+-l))$/.test(cmd),
      "level": /^ls((\s+-l)?(\s+\d+))$|^ls((\s+\d+)(\s+-l)?)$/.test(cmd)
        ? Number(cmd.match(/\d+/)[0])
        : 1
    }

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

  async cdCommand({ currentPath, cmd, currentWorkingFolder, currentFolders }: CommandLineBodyMore) {
    if (!/^cd\s+[a-zA-Z0-9 .\/_-]+$/.test(cmd)) {
      handleError('invalid cd command', ErrorCode.INVALID_CMD)
    }
    let destinationPath = cmd.match(/^cd\s+([a-zA-Z0-9 .\/_-]+)$/)[1].clean()
    const destinationFolders = await this.analyzePath(
      destinationPath,
      destinationPath.slice(0, 1) !== '/' && currentWorkingFolder
    )
    const firstFolderInDestination = destinationFolders[0]

    if (/^\/[a-zA-Z0-9 _-]*/.test(destinationPath)) { // e.g. /a/b/c, don't care current folder, cd from root
      if (!firstFolderInDestination) { // cd to root
        return {
          newWorkingFolder: '/'
        }
      } else if (firstFolderInDestination.folder) {
        handleError("the destination doesn't exists", ErrorCode.PATH_NOT_EXISTS)
      }
      return {
        newWorkingFolder: this.generatePathFromArray(destinationFolders)
      }
    } else if (/^(?:\.\/)?[a-zA-Z0-9 _-]+/.test(destinationPath)) { // e.g. a/b/c, cd from current folder to anywhere
      if (!currentWorkingFolder) { // root
        if (firstFolderInDestination.folder) {
          handleError("error here", ErrorCode.PATH_NOT_EXISTS)
        } else {
          return {
            newWorkingFolder: this.concatPath(currentFolders, destinationFolders)
          }
        }
      } else if (firstFolderInDestination.folder?.id !== currentWorkingFolder?.id) {
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

  async analyzePath(path: string, currentFolder?: Folder, selects: string[] = []) {
    if (!currentFolder && path.includes('..')) {
      handleError("can't back to previous root", ErrorCode.PATH_NOT_EXISTS)
    }
    const folders: Folder[] = []

    let _path = path
    let _currentFolder = currentFolder
    if (_path.includes('..')) {
      let lastFolder = currentFolder
      while (_path.includes('..')) {
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

        _path = _path.replace(/\.\./, '') // replace 1 time
      }
      folders.push(lastFolder)
      _currentFolder = lastFolder
    }
    if (_path === '') return folders.length
      ? folders
      : [
        !selects.length || !currentFolder
          ? currentFolder
          : await this.foldersRepository.findOne(currentFolder.id, { relations: selects })
      ]
    const folderNames = _path.split('/').filter(e => e !== '')
    if (!folderNames.length) return folders
    if (folderNames.length) {
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
          relations: ['folder'].concat(selects)
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
    while (folders.length && index !== folders.length) {
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
        size: totalFileSize,
        ...folder,
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
      ...(
        isDetail
          ? {
            size: totalFileSize + totalFolderSize
          }
          : {}
      ),
      ...folder,
      folders: currentLevel < options.level
        ? childFolderSizes
        : childFolderSizes.map(childFolderSize => {
          delete childFolderSize.folders
          delete childFolderSize.files
          return childFolderSize
        }),
    }
  }
}
