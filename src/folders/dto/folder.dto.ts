import { ApiProperty } from "@nestjs/swagger"
import { IsString, MaxLength, IsNotEmpty, Matches, IsNumber, IsOptional } from "class-validator"

export class CreateFolderDto {
  @ApiProperty()
  @IsString()
  @MaxLength(128)
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9 _-]+$/)
  name: string

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  folderId?: number
}