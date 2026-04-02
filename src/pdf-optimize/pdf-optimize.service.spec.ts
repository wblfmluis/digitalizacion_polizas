import { Test, TestingModule } from '@nestjs/testing';
import { PdfOptimizeService } from './pdf-optimize.service';

describe('PdfOptimizeService', () => {
  let service: PdfOptimizeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfOptimizeService],
    }).compile();

    service = module.get<PdfOptimizeService>(PdfOptimizeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
