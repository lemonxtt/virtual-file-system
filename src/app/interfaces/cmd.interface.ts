import { IFile } from "./file.interface";
import { IFolder } from "./folder.interface";

export type IFileFolder = Pick<IFolder, 'name' | 'size' | 'createdAt' | 'updatedAt'> & {
  isFile?: boolean
  fileFolders?: IFileFolder[]
  isDetail?: boolean
}
export interface ICmdHistory {
  currentPath: string
  cmd: string
  results?: any
  files?: IFile[]
  folders?: IFolder[]
  errorMessage?: string
  isDetail?: boolean
  fileFolders?: IFileFolder[]
}