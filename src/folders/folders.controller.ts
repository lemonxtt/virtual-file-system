import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateFolderDto } from './dto/folder.dto';
import { Folder } from './folder.entity';
import { FoldersService } from './folders.service';

@Controller('folders')
@ApiTags('folders')
export class FoldersController {
  constructor(private folderService: FoldersService) { }
    @Get()
    getAll(@Param() params) {
        return this.folderService.getFolders()
    }

    @Get(':id')
    get(@Param() params) {
        return this.folderService.getFolder(params.id);
    }

    @Post()
    create(@Body() folder: CreateFolderDto) {
        return this.folderService.createFolder(folder);
    }

    @Put()
    update(@Body() folder: Folder) {
        return this.folderService.updateFolder(folder);
    }

    @Delete(':id')
    deleteFolder(@Param() params) {
        return this.folderService.deleteFolder(params.id);
    }

}
