import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CommandLineService } from './command-line.service';
import { CommandLineBodyDto } from './dto/command-line.dto';

@Controller('command-lines')
@ApiTags('command-lines')
export class CommandLineController {

  constructor(
    private commandLineService: CommandLineService,
  ) { }

  @Post()
  create(@Body() body: CommandLineBodyDto) {
      return this.commandLineService.execute(body)
  }

}
