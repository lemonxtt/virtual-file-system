import { Folder } from "src/folders/folder.entity";
import { File } from "src/files/file.entity";

export interface ILsOptions {
  "-l": boolean
  "level": number
}

export interface IAnalyzePathOptions {
  path: string
  currentFolder?: Folder
  selects?: string[]
}

export interface IAnalyzePathResult {
  folders: Folder[]
  parentFolder: Folder
  file?: File
}