import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types, ClientSession } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { MongoRepository } from '../database/repository';
import {
  CreateEventSchema,
  EventDocument,
  EventStatus,
} from './schemas/event.schema';
import { CreateEventDto } from './dto/create-event.dto';
import { PaginationQuery } from 'src/place/queries/pagination.query';
import { ParticipatorsFilterQuery } from './dto/participators-filter.query';
import { endOfDay, startOfDay } from 'date-fns';
import { getPaginatedEventData } from './aggregations/paginated-event-data';
import { Event } from './schemas/event.schema';
import { toMongoObjectId } from 'src/utils/mongo';
@Injectable()
export class EventRepository extends MongoRepository<
  EventDocument,
  CreateEventSchema
> {
  constructor(
    @InjectModel(Event.name) private readonly eventModel: Model<EventDocument>,
  ) {
    super(eventModel);
  }
  createEvent(
    createEventDto: CreateEventDto,
    placeId: string,
    session: ClientSession,
    imageId?: string,
  ) {
    return this.create(
      {
        ...createEventDto,
        img: imageId,
        place: placeId,
      },
      session,
    );
  }
  findByLocationId(locationId: string) {
    return this.eventModel
      .find({ locationIds: new Types.ObjectId(locationId) })
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

  findByUserId(
    paginationQuery: PaginationQuery,
    uid: string,
    status?: EventStatus,
    placeId?: string,
  ) {
    const filterQuery: any = {
      userId: uid,
    };

    if (status) {
      filterQuery.status = status;
    }

    if (placeId) {
      filterQuery.place = new Types.ObjectId(placeId);
    }

    return this.findPaginated(paginationQuery, filterQuery);
  }

  async findPaginated(
    paginationQuery: PaginationQuery,
    entityFilterQuery: FilterQuery<Model<EventDocument>>,
    sortQuery?: FilterQuery<Model<EventDocument>>,
  ) {
    const { start, limit } = paginationQuery;
    let pipeline = this.eventModel.aggregate();

    if (sortQuery) {
      pipeline = pipeline.sort(sortQuery);
    }

    const result = await pipeline.facet(
      getPaginatedEventData(start, limit, entityFilterQuery),
    );
    return result[0];
  }

  async findByIdAndDelete(id: string, session?: ClientSession) {
    return this.eventModel.findByIdAndDelete(toMongoObjectId(id), {
      session,
    });
  }

  async updateEvent(id: string, updateData: Partial<CreateEventSchema>) {
    return this.eventModel
      .findByIdAndUpdate(
        toMongoObjectId(id),
        { $set: updateData },
        { new: true },
      )
      .populate('place')
      .populate('participators.user')
      .lean()
      .exec();
  }

  async findPaginatedByCountryCode(
    paginationQuery: PaginationQuery,
    countryCode: string,
    activeOnly?: boolean,
  ) {
    const { start, limit } = paginationQuery;
    let pipeline = this.eventModel.aggregate();

    const result = await pipeline.facet(
      getPaginatedEventData(
        start,
        limit,
        {},
        countryCode,
        undefined,
        activeOnly,
      ),
    );

    return result[0];
  }

  async findPaginatedByLocationIds(
    paginationQuery: PaginationQuery,
    locationIds: string[],
    activeOnly?: boolean,
  ) {
    const { start, limit } = paginationQuery;
    const objectIds = locationIds.map((id) => new Types.ObjectId(id));
    let pipeline = this.eventModel.aggregate();

    const result = await pipeline.facet(
      getPaginatedEventData(start, limit, {}, undefined, objectIds, activeOnly),
    );

    return result[0];
  }

  async findPaginatedByParticipatorId(
    paginationQuery: PaginationQuery,
    userId: string,
    activeOnly?: boolean,
  ) {
    const { start, limit } = paginationQuery;
    let pipeline = this.eventModel.aggregate();

    // Dodaj filtr po participatorId
    pipeline = pipeline.match({
      'participators.user': new Types.ObjectId(userId),
    });

    // Opcjonalnie filtruj tylko aktywne eventy
    if (activeOnly) {
      pipeline = pipeline.match({
        endDate: { $gte: new Date() },
      });
    }

    // Populate place
    pipeline = pipeline.lookup({
      from: 'places',
      localField: 'place',
      foreignField: '_id',
      as: 'place',
    });

    const dataPipeline = [
      { $skip: start },
      { $limit: limit },
      {
        $project: {
          locationIds: 1,
          startDate: 1,
          endDate: 1,
          participators: 1,
          title: 1,
          content: 1,
          img: {
            $cond: {
              if: { $ne: ['$img', null] },
              then: {
                $concat: [`${process.env.CLOUDI_URL}/`, '$img'],
              },
              else: null,
            },
          },
          place: {
            $mergeObjects: [
              { $arrayElemAt: ['$place', 0] },
              {
                logo: {
                  $concat: [
                    `${process.env.CLOUDI_URL}/`,
                    { $arrayElemAt: ['$place.logo', 0] },
                  ],
                },
              },
            ],
          },
        },
      },
    ];

    const metadataPipeline = [
      { $count: 'total' },
      {
        $addFields: {
          start: start,
          limit: limit,
        },
      },
    ];

    const result = await pipeline.facet({
      metadata: metadataPipeline,
      data: dataPipeline,
    });

    return result[0];
  }

  async findPaginatedParticipators(
    eventId: string,
    filterQuery: ParticipatorsFilterQuery,
  ) {
    const page = filterQuery.start || 1;
    const limit = filterQuery.limit || 10;
    const start = (page - 1) * limit;
    const { email } = filterQuery;

    const event = await this.eventModel
      .findById(eventId)
      .select('participators')
      .populate({
        path: 'participators.user',
        select: '_id email',
      })
      .lean()
      .exec();

    if (!event) {
      return null;
    }

    let filteredParticipators = event.participators;

    // Filtruj po email jeśli został podany
    if (email) {
      filteredParticipators = filteredParticipators.filter((participator) => {
        const userEmail = participator.user?.email;
        return (
          userEmail && userEmail.toLowerCase().includes(email.toLowerCase())
        );
      });
    }

    const total = filteredParticipators.length;
    const paginatedParticipators = filteredParticipators.slice(
      start,
      start + limit,
    );

    return {
      data: paginatedParticipators,
      metadata: {
        start,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: start + limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }
}
