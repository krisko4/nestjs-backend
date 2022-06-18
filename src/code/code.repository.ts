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
}
