import { Test, TestingModule } from '@nestjs/testing';
import { BusinessTypeController } from './business-type.controller';
import { BusinessTypeService } from './business-type.service';
import { BusinessType } from './schemas/business-type.schema';
import { businessTypeStub } from './test/stubs/business-type.stub';
jest.mock('./business-type.service');

describe('BusinessTypeController', () => {
  let controller: BusinessTypeController;
  let service: BusinessTypeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BusinessTypeController],
      providers: [BusinessTypeService],
    }).compile();
    controller = module.get<BusinessTypeController>(BusinessTypeController);
    service = module.get<BusinessTypeService>(BusinessTypeService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
  describe('findAll', () => {
    describe('when findAll is called', () => {
      let stub: BusinessType;
      let results: BusinessType[];
      beforeEach(async () => {
        stub = businessTypeStub();
        results = await controller.findAll();
      });
      it('should call service method', () => {
        expect(service.findAll).toHaveBeenCalled();
      });
      it('should return business types', () => {
        expect(results).toEqual([stub]);
      });
    });
  });
});
