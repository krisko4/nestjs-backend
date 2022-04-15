import { Test, TestingModule } from '@nestjs/testing';
import { OpinionService } from './opinion.service';

describe('OpinionService', () => {
  let service: OpinionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OpinionService],
    }).compile();

    service = module.get<OpinionService>(OpinionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
