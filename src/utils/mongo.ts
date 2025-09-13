import { Types } from 'mongoose';

export const toMongoObjectId = (id: string) => {
  return typeof id === 'string' ? new Types.ObjectId(id) : id;
};
