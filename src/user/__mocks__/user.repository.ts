import { userStub } from "../test/stubs/user.stub";

export const UserRepository = jest.fn().mockReturnValue({
  findByEmail: jest.fn().mockResolvedValue(userStub()),
  find: jest.fn().mockResolvedValue([userStub()]),
  create: jest.fn().mockResolvedValue(userStub())
});
