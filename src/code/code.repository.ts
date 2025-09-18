import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { MongoRepository } from '../database/repository';
import { Code, CodeDocument, CreateCodeSchema } from './schemas/code.schema';
import { CreateCodeDto } from './dto/create-code.dto';
import { CodeType } from './queries/code-filter.query';
import { toMongoObjectId } from 'src/utils/mongo';

@Injectable()
export class CodeRepository extends MongoRepository<
  CodeDocument,
  CreateCodeSchema
> {
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
        user: toMongoObjectId(userId),
        reward: rewardId ? toMongoObjectId(rewardId) : undefined,
        invitation: invitationId ? toMongoObjectId(invitationId) : undefined,
        value,
      },
      session,
    );
  }
  findByRewardId(rewardId: string) {
    return this.find({ reward: new Types.ObjectId(rewardId) });
  }

  findByRewardsIds(rewardsIds: string[]) {
    const validRewardsIds = rewardsIds.map((id) => new Types.ObjectId(id));
    return this.find({ reward: { $in: validRewardsIds } });
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

  async findByRewardIdAndUserId(rewardId: string, userId: string) {
    return this.codeModel.findOne({
      user: toMongoObjectId(userId),
      reward: toMongoObjectId(rewardId),
    });
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

  async findByRewardIdAndDelete(rewardId: string, session?: ClientSession) {
    return this.codeModel.deleteMany(
      { reward: new Types.ObjectId(rewardId) },
      { session },
    );
  }
}
