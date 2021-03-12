import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsOptional, IsString, Matches, MaxLength } from "class-validator";

export class CreateFileDto {
  @ApiProperty()
  @IsString()
  @MaxLength(128)
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9 _-]+$/)
  name: string
  
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  value: string
  
  @ApiProperty()
  @IsNumber()
  @IsOptional()
  folderId?: number
}