import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { MongoRepository } from '../database/repository';
import { EventDocument } from './schemas/event.schema';
import { CreateEventDto } from './dto/create-event.dto';
import { EventFilterQuery } from './queries/event-filter.query';
import { PaginationQuery } from 'src/place/queries/pagination.query';
import { endOfDay, startOfDay } from 'date-fns';
import { getPaginatedEventData } from './aggregations/paginated-event-data';

@Injectable()
export class EventRepository extends MongoRepository<EventDocument> {
  constructor(
    @InjectModel(Event.name) private readonly eventModel: Model<EventDocument>,
  ) {
    super(eventModel);
  }
  createEvent(createEventDto: CreateEventDto, imageId?: string) {
    console.log(imageId);
    return this.create({ ...createEventDto, img: imageId });
  }
  findByLocationId(locationId: string) {
    return this.find({ locationId: new Types.ObjectId(locationId) });
  }
  findPopular(paginationQuery: PaginationQuery) {
    const { start, limit } = paginationQuery;
    return this.eventModel.find().skip(start).limit(limit);
  }
  findToday(paginationQuery: PaginationQuery) {
    const today = new Date();
    const filterQuery = {
      startDate: { $gte: startOfDay(today), $lt: endOfDay(today) },
    };
    return this.findPaginated(paginationQuery, filterQuery);
  }

  private async findPaginated(
    paginationQuery: PaginationQuery,
    entityFilterQuery: FilterQuery<Model<EventDocument>>,
  ) {
    const { start, limit } = paginationQuery;
    const result = await this.eventModel
      .aggregate()
      .facet(getPaginatedEventData(start, limit, entityFilterQuery));
    return result[0];
  }
}
