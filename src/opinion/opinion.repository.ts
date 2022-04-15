import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { IRepository } from '../database/repository';
import { Opinion, OpinionDocument } from './schemas/opinion.schema';

@Injectable()
export class OpinionRepository extends IRepository<OpinionDocument> {
  constructor(
    @InjectModel(Opinion.name)
    private readonly opinionModel: Model<OpinionDocument>,
  ) {
    super(opinionModel);
  }
}
