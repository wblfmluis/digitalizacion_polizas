import { Test, TestingModule } from '@nestjs/testing';
import { AppwriteController } from './appwrite.controller';

describe('AppwriteController', () => {
  let controller: AppwriteController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppwriteController],
    }).compile();

    controller = module.get<AppwriteController>(AppwriteController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
