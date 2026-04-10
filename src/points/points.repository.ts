import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { UserPoints, UserPointsDocument } from './schemas/user-points.schema';
import {
  PointsTransaction,
  PointsTransactionDocument,
  PointsTransactionType,
} from './schemas/points-transaction.schema';
import { toMongoObjectId } from 'src/utils/mongo';

@Injectable()
export class PointsRepository {
  constructor(
    @InjectModel(UserPoints.name)
    private readonly userPointsModel: Model<UserPointsDocument>,
    @InjectModel(PointsTransaction.name)
    private readonly pointsTransactionModel: Model<PointsTransactionDocument>,
  ) {}

  async addPoints(
    userId: string,
    placeId: string,
    points: number,
    session?: ClientSession,
  ): Promise<UserPointsDocument> {
    return this.userPointsModel.findOneAndUpdate(
      {
        user: toMongoObjectId(userId),
        place: toMongoObjectId(placeId),
      },
      {
        $inc: { points },
        $set: { updatedAt: new Date() },
      },
      { new: true, upsert: true, session },
    );
  }

  async deductPoints(
    userId: string,
    placeId: string,
    points: number,
    session?: ClientSession,
  ): Promise<UserPointsDocument | null> {
    return this.userPointsModel.findOneAndUpdate(
      {
        user: toMongoObjectId(userId),
        place: toMongoObjectId(placeId),
        points: { $gte: points },
      },
      {
        $inc: { points: -points },
        $set: { updatedAt: new Date() },
      },
      { new: true, session },
    );
  }

  async getUserPoints(
    userId: string,
    placeId: string,
  ): Promise<UserPointsDocument | null> {
    return this.userPointsModel.findOne({
      user: toMongoObjectId(userId),
      place: toMongoObjectId(placeId),
    });
  }

  async createTransaction(
    data: {
      userId: string;
      placeId: string;
      points: number;
      type: PointsTransactionType;
      sourceId: string;
    },
    session?: ClientSession,
  ): Promise<PointsTransactionDocument> {
    const transaction = new this.pointsTransactionModel({
      user: toMongoObjectId(data.userId),
      place: toMongoObjectId(data.placeId),
      points: data.points,
      type: data.type,
      sourceId: toMongoObjectId(data.sourceId),
    });
    return transaction.save({ session });
  }

  async findTransactionsByUserAndPlace(
    userId: string,
    placeId: string,
    start: number,
    limit: number,
  ) {
    const filter = {
      user: toMongoObjectId(userId),
      place: toMongoObjectId(placeId),
    };

    const [data, total] = await Promise.all([
      this.pointsTransactionModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(start)
        .limit(limit)
        .exec(),
      this.pointsTransactionModel.countDocuments(filter),
    ]);

    return {
      data,
      metadata: [{ total, start, limit }],
    };
  }
}
