import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types, ClientSession } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { MongoRepository } from '../database/repository';
import { EventDocument } from './schemas/event.schema';
import { CreateEventDto } from './dto/create-event.dto';
import { PaginationQuery } from 'src/place/queries/pagination.query';
import { endOfDay, startOfDay } from 'date-fns';
import { getPaginatedEventData } from './aggregations/paginated-event-data';
import { Event } from './schemas/event.schema';
@Injectable()
export class EventRepository extends MongoRepository<EventDocument> {
  constructor(
    @InjectModel(Event.name) private readonly eventModel: Model<EventDocument>,
  ) {
    super(eventModel);
  }
  createEvent(
    createEventDto: CreateEventDto,
    session: ClientSession,
    imageId?: string,
  ) {
    return this.create(
      {
        ...createEventDto,
        img: imageId,
        place: createEventDto.placeId,
      },
      session,
    );
  }
  findByLocationId(locationId: string) {
    return this.eventModel
      .find({ locationId: new Types.ObjectId(locationId) })
      .populate('place')
      .populate('participators')
      .lean();
  }
  findPopular(paginationQuery: PaginationQuery) {
    const sortQuery = {
      participators: -1,
    };
    return this.findPaginated(paginationQuery, {}, sortQuery);
  }
  findToday(paginationQuery: PaginationQuery) {
    const today = new Date();
    const filterQuery = {
      startDate: { $gte: startOfDay(today), $lt: endOfDay(today) },
    };
    const sortQuery = {
      startDate: -1,
    };
    return this.findPaginated(paginationQuery, filterQuery, sortQuery);
  }
  addParticipator(id: string, userId: string) {
    return this.findByIdAndUpdate(id, {
      $push: {
        participators: {
          user: userId,
        },
      },
    });
  }

  rateEvent(id: string, participatorId: string, rate: number) {
    return this.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        'participators.user': new Types.ObjectId(participatorId),
      },
      {
        $set: {
          'participators.$.rate': rate,
        },
      },
    );
  }

  markParticipationIRL(id: string, participatorId: string) {
    return this.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        'participators.user': new Types.ObjectId(participatorId),
      },
      {
        $set: {
          'participators.$.didReallyParticipate': true,
        },
      },
    );
  }

  removeParticipator(id: string, userId: string) {
    return this.findByIdAndUpdate(id, {
      $pull: { participators: { user: userId } },
    });
  }
  findByIdAndParticipatorId(id: string, uid: string, populated?: boolean) {
    const doc = this.eventModel.findOne({
      _id: new Types.ObjectId(id),
      'participators.user': new Types.ObjectId(uid),
    });
    if (populated) {
      return doc.populate('place').populate('participators.user').lean();
    }
    return doc;
  }
  findByParticipatorId(uid: string) {
    return this.eventModel
      .find({ 'participators.user': new Types.ObjectId(uid) })
      .populate('place')
      .populate('participators.user')
      .lean();
  }

  findByPlacesIds(placesIds: string[]) {
    const validPlacesIds = placesIds.map((p) => new Types.ObjectId(p));
    return this.eventModel
      .find({ place: { $in: validPlacesIds } })
      .populate('place')
      .populate('participators.user')
      .lean()
      .exec();
  }

  findEventById(id: string): Promise<Event> {
    return this.eventModel
      .findById(id)
      .populate('participators.user')
      .populate('place')
      .lean()
      .exec();
  }

  findAll() {
    return this.eventModel.find().lean();
  }

  private async findPaginated(
    paginationQuery: PaginationQuery,
    entityFilterQuery: FilterQuery<Model<EventDocument>>,
    sortQuery?: FilterQuery<Model<EventDocument>>,
  ) {
    const { start, limit } = paginationQuery;
    const result = await this.eventModel
      .aggregate()
      .sort(sortQuery)
      .facet(getPaginatedEventData(start, limit, entityFilterQuery));
    return result[0];
  }
}
