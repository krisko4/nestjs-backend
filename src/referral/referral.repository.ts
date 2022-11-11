import { CreateReferralDto } from './dto/create-referral.dto';
import { Referral, ReferralDocument } from './schemas/referral.schema';

import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
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

  async findByLocationId(locationId: string) {
    return this.referralModel
      .find({
        locationId: new Types.ObjectId(locationId),
      })
      .lean();
  }

  async findByInvitationId(invitationId: string) {
    return this.findOne({
      'invitations._id': new Types.ObjectId(invitationId),
    });
  }

  async invite(
    id: string,
    userId: string,
    invitedUserIds: string[],
    session?: ClientSession,
  ) {
    return this.findByIdAndUpdate(
      id,
      {
        $push: {
          invitations: {
            referrer: new Types.ObjectId(userId),
            invitedUsers: invitedUserIds.map((uid) => new Types.ObjectId(uid)),
          },
        },
      },
      session,
    );
  }

  findByIdPopulated(id: string) {
    return this.referralModel.findById(id).populate('invitations.referrer');
  }

  createReferral(createReferralDto: CreateReferralDto, session: ClientSession) {
    const { locationId, ...rest } = createReferralDto;
    return this.create(
      {
        locationId: new Types.ObjectId(locationId),
        ...rest,
      },
      session,
    );
  }
}
