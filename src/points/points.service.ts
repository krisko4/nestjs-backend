import { BadRequestException, Injectable } from '@nestjs/common';
import { ClientSession } from 'mongoose';
import { PointsRepository } from './points.repository';
import { PointsTransactionType } from './schemas/points-transaction.schema';

@Injectable()
export class PointsService {
  constructor(private readonly pointsRepository: PointsRepository) {}

  async addPoints(
    userId: string,
    placeId: string,
    points: number,
    type: PointsTransactionType,
    sourceId: string,
    session?: ClientSession,
  ) {
    const userPoints = await this.pointsRepository.addPoints(
      userId,
      placeId,
      points,
      session,
    );

    await this.pointsRepository.createTransaction(
      {
        userId,
        placeId,
        points,
        type,
        sourceId,
      },
      session,
    );

    return userPoints;
  }

  async deductPoints(
    userId: string,
    placeId: string,
    points: number,
    type: PointsTransactionType,
    sourceId: string,
    session?: ClientSession,
  ) {
    const result = await this.pointsRepository.deductPoints(
      userId,
      placeId,
      points,
      session,
    );

    if (!result) {
      throw new BadRequestException('INSUFFICIENT_POINTS');
    }

    await this.pointsRepository.createTransaction(
      {
        userId,
        placeId,
        points: -points,
        type,
        sourceId,
      },
      session,
    );

    return result;
  }

  async getUserPointsAtPlace(userId: string, placeId: string): Promise<number> {
    const userPoints = await this.pointsRepository.getUserPoints(
      userId,
      placeId,
    );
    return userPoints?.points ?? 0;
  }

  async getPointsHistory(
    userId: string,
    placeId: string,
    start: number,
    limit: number,
  ) {
    return this.pointsRepository.findTransactionsByUserAndPlace(
      userId,
      placeId,
      start,
      limit,
    );
  }
}
