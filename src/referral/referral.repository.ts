import { UpdateReferralDto } from './dto/update-referral.dto';
import { CreateReferralDto } from './dto/create-referral.dto';
import { Referral, ReferralDocument } from './schemas/referral.schema';

import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { MongoRepository } from '../database/repository';
@Injectable()
export class ReferralRepository extends MongoRepository<ReferralDocument> {
  constructor(
    @InjectModel(Referral.name)
    private readonly referralModel: Model<ReferralDocument>,
  ) {
    super(referralModel);
  }

  findByLocationId(locationId: string) {
    return this.find({ locationId: new Types.ObjectId(locationId) });
  }

  async invite(id: string, userId: string, invitedUserIds: string[]) {
    return this.findByIdAndUpdate(id, {
      $push: {
        invitations: {
          referrer: new Types.ObjectId(userId),
          invitedUsers: invitedUserIds.map((uid) => new Types.ObjectId(uid)),
        },
      },
    });
  }

  findByIdPopulated(id: string) {
    return this.referralModel.findById(id).populate('referrer');
  }

  findByReferrerIdAndLocationId(userId: string, locationId: string) {
    return this.findOne({
      locationId: new Types.ObjectId(locationId),
      'invitations.referrer': new Types.ObjectId(userId),
    });
  }

  findByInvitedUserIdAndLocationId(userId: string, locationId: string) {
    return this.findOne({
      locationId: new Types.ObjectId(locationId),
      'invitations.invitedUsers': new Types.ObjectId(userId),
    });
  }

  createReferral(createReferralDto: CreateReferralDto) {
    const { locationId, ...rest } = createReferralDto;
    return this.create({
      locationId: new Types.ObjectId(locationId),
      ...rest,
    });
  }
}
