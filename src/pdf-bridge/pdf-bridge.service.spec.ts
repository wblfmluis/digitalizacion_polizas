import { Test, TestingModule } from '@nestjs/testing';
import { PdfBridgeService } from './pdf-bridge.service';

describe('PdfBridgeService', () => {
  let service: PdfBridgeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfBridgeService],
    }).compile();

    service = module.get<PdfBridgeService>(PdfBridgeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
