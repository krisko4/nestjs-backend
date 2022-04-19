export const UserService = jest.fn().mockReturnValue({
    findByEmail: jest.fn().mockResolvedValue(null)
})