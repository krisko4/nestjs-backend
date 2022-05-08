import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { MongoRepository } from 'src/database/repository';
import {
  Subscription,
  SubscriptionDocument,
} from './schemas/subscription.schema';
import { Types, Model } from 'mongoose';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { SubscriptionFilterQuery } from './queries/subscription-filter.query';

@Injectable()
export class SubscriptionRepository extends MongoRepository<SubscriptionDocument> {
  constructor(
    @InjectModel(Subscription.name)
    private readonly subscriptionModel: Model<SubscriptionDocument>,
  ) {
    super(subscriptionModel);
  }
  createSubscription(createSubscriptionDto: CreateSubscriptionDto) {
    const { userId, locationId } = createSubscriptionDto;
    return this.create({
      user: new Types.ObjectId(userId),
      locationId: new Types.ObjectId(locationId),
    });
  }
  findByUserId(uid: string) {
    return this.find({
      user: new Types.ObjectId(uid),
    });
  }
  findByLocationId(locationId: string) {
    return this.find({
      locationId: new Types.ObjectId(locationId),
    });
  }
  deleteByUserId(uid: string) {
    return this.deleteMany({
      user: new Types.ObjectId(uid),
    });
  }
  deleteByLocationId(locationId: string) {
    return this.deleteMany({
      locationId: new Types.ObjectId(locationId),
    });
  }
  findByUserIdAndLocationId(uid: string, locationId: string) {
    return this.findOne({
      user: new Types.ObjectId(uid),
      locationId: new Types.ObjectId(locationId),
    });
  }
  deleteByUserIdAndLocationId(uid: string, locationId: string) {
    return this.findOneAndDelete({
      user: new Types.ObjectId(uid),
      locationId: new Types.ObjectId(locationId),
    });
  }
}
