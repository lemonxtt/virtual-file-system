import { IBase } from "./base.interface";
import { IFolder } from "./folder.interface";

export interface IFile extends IBase {
  name: string
  size: number
  value: string
  folder?: IFolder
}