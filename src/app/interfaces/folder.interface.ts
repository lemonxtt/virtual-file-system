import { IBase } from "./base.interface";
import { IFile } from "./file.interface";

export interface IFolder extends IBase {
  name: string
  size?: number
  files?: IFile[]
  folders?: IFolder[]
  folder?: IFolder
}