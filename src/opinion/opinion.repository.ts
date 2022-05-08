import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { MongoRepository } from '../database/repository';
import { Opinion, OpinionDocument } from './schemas/opinion.schema';
import { Types } from 'mongoose';
import { getOpinionsFacet } from './aggregations/facets/opinions.facet';
import { endOfDay, format, startOfDay } from 'date-fns';

@Injectable()
export class OpinionRepository extends MongoRepository<OpinionDocument> {
  constructor(
    @InjectModel(Opinion.name)
    private readonly opinionModel: Model<OpinionDocument>,
  ) {
    super(opinionModel);
  }

  async findByLocationIds(locationIds: Types.ObjectId[]) {
    const start = startOfDay(new Date());
    const end = endOfDay(new Date());
    const aggregationResult = await this.opinionModel
      .aggregate()
      .match({ locationId: { $in: locationIds } })
      .facet(getOpinionsFacet(start, end));
    const opinionData = aggregationResult[0];
    const todayArr = opinionData.today;
    const totalArr = opinionData.total;
    const opinionArr = opinionData.data;
    const today = todayArr.length > 0 ? todayArr[0].today : 0;
    const total = totalArr.length > 0 ? totalArr[0].total : 0;
    for (const opinionObj of opinionArr) {
      for (const opinion of opinionObj.visits) {
        opinion.date = format(opinion.date, 'yyyy-MM-dd HH:mm:ss');
      }
    }
    return {
      total: total,
      today: today,
      locations: opinionArr,
    };
  }
}
