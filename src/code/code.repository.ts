import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { MongoRepository } from '../database/repository';
import { Code, CodeDocument } from './schemas/code.schema';
import { CreateCodeDto } from './dto/create-code.dto';
import { CodeType } from './queries/code-filter.query';

@Injectable()
export class CodeRepository extends MongoRepository<CodeDocument> {
  constructor(
    @InjectModel(Code.name)
    private readonly codeModel: Model<CodeDocument>,
  ) {
    super(codeModel);
  }
  createCode(
    createCodeDto: CreateCodeDto,
    value: string,
    session?: ClientSession,
  ) {
    const { userId, rewardId, invitationId } = createCodeDto;
    return this.create(
      {
        user: new Types.ObjectId(userId),
        reward: rewardId && new Types.ObjectId(rewardId),
        invitation: invitationId && new Types.ObjectId(invitationId),
        value,
      },
      session,
    );
  }
  findByRewardId(rewardId: string) {
    return this.find({ reward: new Types.ObjectId(rewardId) });
  }

  findByValue(value: string) {
    return this.codeModel.findOne({ value }).populate({
      path: 'invitation',
      populate: {
        path: 'referral',
      },
    });
  }

  useCode(id: string) {
    return this.findByIdAndUpdate(id, { isUsed: true });
  }

  async findReferralCodes(userId: string) {
    const codes = await this.codeModel
      .find({ user: new Types.ObjectId(userId) })
      .populate({
        path: 'invitation',
        populate: {
          path: 'referral',
        },
      });

    return codes.filter((c) => c.invitation);
  }

  async findRewardCodes(userId: string) {
    const codes = await this.codeModel
      .find({ user: new Types.ObjectId(userId) })
      .populate({
        path: 'reward',
        populate: {
          path: 'event',
          populate: {
            path: 'place',
          },
        },
      });

    return codes.filter((c) => c.reward);
  }

  async findByUserId(userId: string) {
    return this.codeModel
      .find({ user: new Types.ObjectId(userId) })
      .populate({
        path: 'reward',
        populate: {
          path: 'event',
          populate: {
            path: 'place',
          },
        },
      })
      .populate({
        path: 'invitation',
        populate: {
          path: 'referral',
        },
      });
  }
}
