import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { MongoRepository } from '../database/repository';
import { Invitation, InvitationDocument } from './schemas/invitation.schema';
@Injectable()
export class InvitationRepository extends MongoRepository<InvitationDocument> {
  constructor(
    @InjectModel(Invitation.name)
    private readonly invitationModel: Model<InvitationDocument>,
  ) {
    super(invitationModel);
  }

  async updateInvitation(
    id: string,
    invitedUserIds: string[],
    session: ClientSession,
  ) {
    return this.findByIdAndUpdate(
      id,
      {
        invitedUsers: invitedUserIds,
      },
      session,
    );
  }

  async createInvitation(
    referralId: string,
    referrerId: string,
    invitedUserId: string,
    session: ClientSession,
  ) {
    return this.create(
      {
        referrer: new Types.ObjectId(referrerId),
        invitedUsers: [new Types.ObjectId(invitedUserId)],
        referral: new Types.ObjectId(referralId),
      },
      session,
    );
  }

  async findByReferralIdAndReferrerId(referralId: string, referrerId: string) {
    return this.invitationModel
      .findOne({
        referrer: new Types.ObjectId(referrerId),
        referral: new Types.ObjectId(referralId),
      })
      .populate('invitedUsers')
      .lean();
  }
}
