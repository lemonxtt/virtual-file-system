import { Test, TestingModule } from '@nestjs/testing';
import { CommandLineController } from './command-line.controller';

describe('CommandLineController', () => {
  let controller: CommandLineController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommandLineController],
    }).compile();

    controller = module.get<CommandLineController>(CommandLineController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
