import { Test, TestingModule } from '@nestjs/testing';
import { PdfBridgeController } from './pdf-bridge.controller';

describe('PdfBridgeController', () => {
  let controller: PdfBridgeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PdfBridgeController],
    }).compile();

    controller = module.get<PdfBridgeController>(PdfBridgeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
