import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession, FilterQuery } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { MongoRepository } from '../database/repository';
import {
  CreateRewardSchema,
  Reward,
  RewardAvailableFor,
  RewardDocument,
} from './schemas/reward.schema';
import { PaginationQuery } from './queries/pagination.query';
import { getPaginatedRewardData } from './aggregations/paginated-reward-data';
import { toMongoObjectId } from 'src/utils/mongo';

@Injectable()
export class RewardRepository extends MongoRepository<
  RewardDocument,
  CreateRewardSchema
> {
  constructor(
    @InjectModel(Reward.name)
    private readonly rewardModel: Model<RewardDocument>,
  ) {
    super(rewardModel);
  }
  findByUserIdAndEventId(uid: string, eventId: string) {
    return this.findOne({
      user: new Types.ObjectId(uid),
      event: new Types.ObjectId(eventId),
    });
  }
  findByUserId(paginationQuery: PaginationQuery, uid: string) {
    return this.findPaginated(
      paginationQuery,
      {
        userId: uid,
      },
      {
        createdAt: -1,
      },
    );
  }
  findByEventId(eventId: string) {
    return this.findOne({ event: new Types.ObjectId(eventId) });
  }

  findByEventsIds(eventsIds: string[]) {
    const validEventsIds = eventsIds.map((id) => new Types.ObjectId(id));
    return this.rewardModel
      .find({ event: { $in: validEventsIds } })
      .populate('event')
      .exec();
  }

  createReward({
    name,
    description,
    eventId,
    session,
    availableFor,
    locationIds,
    placeId,
    selectedUserIds,
    usageLimit,
  }: {
    name: string;
    description: string;
    eventId?: string;
    session?: ClientSession;
    availableFor: RewardAvailableFor;
    locationIds: string[];
    placeId: string;
    selectedUserIds?: string[];
    usageLimit?: number | null;
  }) {
    const reward: any = {
      name,
      description,
      event: eventId,
      availableFor,
      place: placeId,
      locationIds: locationIds.map((id) => new Types.ObjectId(id)),
      usageLimit: usageLimit ?? null,
    };

    // Dodaj selectedUserIds tylko gdy availableFor = SELECTED_USERS
    if (
      availableFor === RewardAvailableFor.SELECTED_USERS &&
      selectedUserIds
    ) {
      reward.selectedUserIds = selectedUserIds.map(
        (id) => new Types.ObjectId(id),
      );
    }

    // if (!scheduledFor) reward['date'] = new Date();
    return this.create(reward, session);
  }

  findById(id: string) {
    return this.rewardModel
      .findById(toMongoObjectId(id))
      .populate('place')
      .exec();
  }

  async findPaginated(
    paginationQuery: PaginationQuery,
    entityFilterQuery: FilterQuery<Model<RewardDocument>>,
    sortQuery?: FilterQuery<Model<RewardDocument>>,
    locationFilter?: { lat?: number; lng?: number },
  ) {
    const { start, limit } = paginationQuery;
    let pipeline = this.rewardModel.aggregate();

    if (sortQuery) {
      pipeline = pipeline.sort(sortQuery);
    }

    const result = await pipeline.facet(
      getPaginatedRewardData(start, limit, entityFilterQuery, locationFilter),
    );

    return result[0];
  }

  async findByIdAndDelete(id: string, session?: ClientSession) {
    return this.rewardModel.findByIdAndDelete(toMongoObjectId(id), {
      session,
    });
  }

  async findPaginatedByCountryCode(
    paginationQuery: PaginationQuery,
    countryCode: string,
  ) {
    const { start, limit } = paginationQuery;
    let pipeline = this.rewardModel.aggregate();

    const result = await pipeline.facet(
      getPaginatedRewardData(start, limit, {}, undefined, countryCode),
    );

    return result[0];
  }

  async findPaginatedByLocationIds(
    paginationQuery: PaginationQuery,
    locationIds: string[],
  ) {
    const { start, limit } = paginationQuery;
    const objectIds = locationIds.map((id) => new Types.ObjectId(id));
    let pipeline = this.rewardModel.aggregate();

    const result = await pipeline.facet(
      getPaginatedRewardData(start, limit, {}, undefined, undefined, objectIds),
    );

    return result[0];
  }
}
