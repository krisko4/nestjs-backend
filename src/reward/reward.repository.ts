import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { MongoRepository } from '../database/repository';
import { Reward, RewardDocument } from './schemas/reward.schema';

@Injectable()
export class RewardRepository extends MongoRepository<RewardDocument> {
  constructor(
    @InjectModel(Reward.name)
    private readonly rewardModel: Model<RewardDocument>,
  ) {
    super(rewardModel);
  }
  findByUserIdAndEventId(uid: string, eventId: string) {
    return this.findOne({
      user: new Types.ObjectId(uid),
      eventId: new Types.ObjectId(eventId),
    });
  }
  findByUserId(uid: string) {
    return this.find({
      user: new Types.ObjectId(uid),
    });
  }
  findByEventId(eventId: string) {
    return this.findOne({ eventId: new Types.ObjectId(eventId) });
  }

  createReward(
    description: string,
    eventId: string,
    rewardPercentage: number,
    session?: ClientSession,
    scheduledFor?: Date,
  ) {
    const reward = {
      description,
      rewardPercentage,
      eventId,
      scheduledFor,
    };
    if (!scheduledFor) reward['date'] = new Date();
    return this.create(reward, session);
  }
}
