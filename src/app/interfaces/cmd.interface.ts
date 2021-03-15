import { IFile } from "./file.interface";
import { IFolder } from "./folder.interface";

export interface ICmdHistory {
  currentPath: string
  cmd: string
  results?: any
  files?: IFile[]
  folders?: IFolder[]
}