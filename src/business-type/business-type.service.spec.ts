import { Test, TestingModule } from '@nestjs/testing';
import { BusinessTypeRepository } from './business-type.repository';
import { BusinessTypeService } from './business-type.service';
import { BusinessType } from './schemas/business-type.schema';
import { businessTypeStub } from './test/stubs/business-type.stub';
jest.mock('./business-type.repository');

describe('NewsService', () => {
  let service: BusinessTypeService;
  let repository: BusinessTypeRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BusinessTypeService, BusinessTypeRepository],
    }).compile();
    service = module.get<BusinessTypeService>(BusinessTypeService);
    repository = module.get<BusinessTypeRepository>(BusinessTypeRepository);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    describe('when findAll is called', () => {
      let results: BusinessType[];
      let stub: BusinessType;
      beforeEach(async () => {
        stub = businessTypeStub();
        results = await service.findAll();
      });
      it('should call repository method', () => {
        expect(repository.find).toHaveBeenCalled();
      });
      it('should return business types', () => {
        expect(results).toEqual([stub]);
      });
    });
  });
});
