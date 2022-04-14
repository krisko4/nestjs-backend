import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { IRepository } from '../database/repository';
import { Visit, VisitDocument } from './schemas/visit.schema';
import { Types } from 'mongoose';

@Injectable()
export class VisitRepository extends IRepository<VisitDocument> {
  constructor(
    @InjectModel(Visit.name) private readonly visitModel: Model<VisitDocument>,
  ) {
    super(visitModel);
  }
  findByLocationId(locationId: string) {
    return this.visitModel
      .aggregate()
      .match({
        locationId: new Types.ObjectId(locationId),
      })
      .facet({
        metadata: [
          { $group: { _id: null, total: { $sum: '$visitCount' } } },
          { $project: { _id: 0 } },
        ],
        data: [{ $sort: { date: 1 } }, { $project: { _id: 0, __v: 0 } }],
      });
  }
}
