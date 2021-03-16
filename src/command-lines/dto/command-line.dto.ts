import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, Matches, MinLength } from "class-validator";
import { Folder } from "src/folders/folder.entity";

export class CommandLineBodyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  cmd: string
  
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @Matches(/^(\/[a-zA-Z0-9 _-]*)+$/, { message: "invalid currentPath" })
  currentPath: string
}

export class CommandLineBodyMore extends CommandLineBodyDto {
  currentWorkingFolder: Folder

  currentFolders: Folder[]
}