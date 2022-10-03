import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { MongoRepository } from '../database/repository';
import { Code, CodeDocument } from './schemas/code.schema';
import { CreateCodeDto } from './dto/create-code.dto';

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
    const { userId, rewardId } = createCodeDto;
    return this.create(
      {
        user: new Types.ObjectId(userId),
        reward: new Types.ObjectId(rewardId),
        value,
      },
      session,
    );
  }
  findByRewardId(rewardId: string) {
    return this.find({ reward: new Types.ObjectId(rewardId) });
  }
  async findByUserId(userId: string) {
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
    return codes.map((code) => {
      return {
        _id: code._id,
        value: code.value,
        description: code.reward.description,
        date: code.reward.date,
        placeLogo: `${process.env.CLOUDI_URL}/${code.reward.event.place.logo}`,
      };
    });
  }
}
