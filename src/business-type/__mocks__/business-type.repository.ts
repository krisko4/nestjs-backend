import { businessTypeStub } from '../test/stubs/business-type.stub';

export const BusinessTypeRepository = jest.fn().mockReturnValue({
  find: jest.fn().mockResolvedValue([businessTypeStub()]),
});
