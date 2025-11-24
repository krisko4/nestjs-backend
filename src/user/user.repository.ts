import { InjectModel } from '@nestjs/mongoose';
import { MongoRepository } from 'src/database/repository';
import { CreateUserSchema, User, UserDocument } from './schemas/user.schema';
import { Model, Types } from 'mongoose';

export class UserRepository extends MongoRepository<
  UserDocument,
  CreateUserSchema
> {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {
    super(userModel);
  }
  findByEmail(email: string) {
    return this.findOne({ email: email });
  }

  findByGoogleId(googleId: string) {
    return this.findOne({ googleId });
  }

  async setNotificationToken(id: string, token: string, language: string) {
    const { notificationTokens } = await this.findById(id);
    const tokens = notificationTokens.filter(
      (notificationToken) => notificationToken !== token,
    );
    tokens.push(token);
    return this.findByIdAndUpdate(id, {
      notificationTokens: tokens,
      userLanguage: language,
    });
  }

  updateProfilePicture(uid: string, logoId: string) {
    return this.findByIdAndUpdate(uid, { img: logoId });
  }

  async removeNotificationTokens(uid: string) {
    return this.findByIdAndUpdate(uid, { notificationTokens: [] });
  }

  async checkIfUserIsSubscriber(id: string, locationId: string) {
    const user = await this.findOne({
      _id: id,
      'subscriptions.subscribedLocations._id': locationId,
    });
    return user ? true : false;
  }

  async addFavoriteLocation(userId: string, locationId: string) {
    return this.userModel.findByIdAndUpdate(
      userId,
      {
        $addToSet: { favoriteLocationIds: new Types.ObjectId(locationId) },
      },
      { new: true },
    );
  }

  async removeFavoriteLocation(userId: string, locationId: string) {
    return this.userModel.findByIdAndUpdate(
      userId,
      {
        $pull: { favoriteLocationIds: new Types.ObjectId(locationId) },
      },
      { new: true },
    );
  }

  async getFavoriteLocationIds(userId: string): Promise<string[]> {
    const user = await this.findById(userId);
    if (!user || !user.favoriteLocationIds) {
      return [];
    }
    return user.favoriteLocationIds.map((id) => id.toString());
  }

  async findUsersByFavoriteLocation(locationId: string): Promise<UserDocument[]> {
    return this.userModel.find({
      favoriteLocationIds: new Types.ObjectId(locationId),
    });
  }
}
