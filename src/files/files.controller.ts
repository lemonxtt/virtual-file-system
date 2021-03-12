import { Controller, Post, Body, Get, Put, Delete,Param} from '@nestjs/common';
import { FilesService } from './files.service';
import { File } from './file.entity';
import { CreateFileDto } from './dto/file.dto';
import { ApiTags } from '@nestjs/swagger';

@Controller('files')
@ApiTags('files')
export class FilesController {

    constructor(private fileService: FilesService) { }

    @Get()
    getAll(@Param() params) {
        return this.fileService.getFiles()
    }

    @Get(':id')
    get(@Param() params) {
        return this.fileService.getFile(params.id);
    }

    @Post()
    create(@Body() file: CreateFileDto) {
        return this.fileService.createFile(file);
    }

    @Put()
    update(@Body() file: File) {
        return this.fileService.updateFile(file);
    }

    @Delete(':id')
    deleteFile(@Param() params) {
        return this.fileService.deleteFile(params.id);
    }
}