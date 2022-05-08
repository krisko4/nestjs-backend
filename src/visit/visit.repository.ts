import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { MongoRepository } from '../database/repository';
import { Visit, VisitDocument } from './schemas/visit.schema';
import { Types } from 'mongoose';
import { getVisitsFacet } from './aggregations/facets/visits.facet';
import { endOfDay, format, isToday, isYesterday, startOfDay } from 'date-fns';

@Injectable()
export class VisitRepository extends MongoRepository<VisitDocument> {
  constructor(
    @InjectModel(Visit.name) private readonly visitModel: Model<VisitDocument>,
  ) {
    super(visitModel);
  }
  async findByLocationId(locationId: string) {
    const aggregationResult = await this.visitModel
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
    const { metadata, data: visits } = aggregationResult[0];
    const total = metadata.length > 0 ? metadata[0].total : 0;
    const today = visits
      .filter((visit) => isToday(new Date(visit.date)))
      .reduce((a, b) => a + b.visitCount, 0);
    const yesterday = visits
      .filter((visit) => isYesterday(new Date(visit.date)))
      .reduce((a, b) => a + b.visitCount, 0);
    return {
      total,
      today,
      yesterday,
      visits: visits.map((visit) => ({
        ...visit,
        date: format(visit.date, 'yyyy-MM-dd HH:mm:ss'),
      })),
    };
  }
  async findByLocationIds(locationIds: Types.ObjectId[]) {
    const start = startOfDay(new Date());
    const end = endOfDay(new Date());
    const aggregationResult = await this.visitModel
      .aggregate()
      .match({
        locationId: { $in: locationIds },
      })
      .facet(getVisitsFacet(start, end));
    const visitData = aggregationResult[0];
    const todayArr = visitData.today;
    const totalArr = visitData.total;
    const visitArr = visitData.data;
    const today = todayArr.length > 0 ? todayArr[0].today : 0;
    const total = totalArr.length > 0 ? totalArr[0].total : 0;
    for (const visitObj of visitArr) {
      for (const visit of visitObj.visits) {
        visit.date = format(visit.date, 'yyyy-MM-dd HH:mm:ss');
      }
    }
    return {
      total: total,
      today: today,
      locations: visitArr,
    };
  }
}
