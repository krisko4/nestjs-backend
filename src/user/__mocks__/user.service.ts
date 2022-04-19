import { userStub } from "../test/stubs/user.stub";

export const UserService = jest.fn().mockReturnValue({
    findAll: jest.fn().mockResolvedValue([userStub()])
})