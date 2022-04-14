import { businessTypeStub } from '../test/stubs/business-type.stub';

export const BusinessTypeService = jest.fn().mockReturnValue({
  findAll: jest.fn().mockResolvedValue([businessTypeStub()]),
});
