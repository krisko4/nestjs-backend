import { InjectModel } from '@nestjs/mongoose';
import { IRepository } from 'src/database/repository';
import { User, UserDocument } from './schemas/user.schema';
import { Model } from 'mongoose';

export class UserRepository extends IRepository<UserDocument> {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {
    super(userModel);
  }
  findByEmail(email: string) {
    return this.findOne({ email: email });
  }
}
