import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, Matches, MinLength } from "class-validator";

export class CommandLineBodyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  cmd: string
  
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @Matches(/^(\/[a-zA-Z0-9 _-]*)+$/, { message: "invalid currentPath" })
  currentPath: string
}