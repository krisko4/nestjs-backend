import { InjectModel } from '@nestjs/mongoose';
import { MongoRepository } from 'src/database/repository';
import { User, UserDocument } from './schemas/user.schema';
import { Model } from 'mongoose';

export class UserRepository extends MongoRepository<UserDocument> {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {
    super(userModel);
  }
  findByEmail(email: string) {
    return this.findOne({ email: email });
  }

  async setNotificationToken(id: string, token: string) {
    const { notificationTokens } = await this.findById(id);
    const tokens = notificationTokens.filter(
      (notificationToken) => notificationToken !== token,
    );
    tokens.push(token);
    return this.findByIdAndUpdate(id, { notificationTokens: tokens });
  }

  async checkIfUserIsSubscriber(id: string, locationId: string) {
    console.log(locationId);
    const user = await this.findOne({
      _id: id,
      'subscriptions.subscribedLocations._id': locationId,
    });
    console.log(user);
    return user ? true : false;
  }
}
