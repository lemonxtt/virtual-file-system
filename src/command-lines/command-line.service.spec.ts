import { Test, TestingModule } from '@nestjs/testing';
import { CommandLineService } from './command-line.service';

describe('CommandLineService', () => {
  let service: CommandLineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CommandLineService],
    }).compile();

    service = module.get<CommandLineService>(CommandLineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
