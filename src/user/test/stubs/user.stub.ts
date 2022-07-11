import { User } from 'src/user/schemas/user.schema';

export const userStub = (): User => {
  return {
    firstName: 'test',
    lastName: 'user',
    email: 'test@user.com',
    birthdate: new Date(2000, 1, 1, 1),
    img: 'image',
    // _id: 'any',
    isActive: false,
    password: 'password',
    notificationTokens: ['token'],
  };
};
