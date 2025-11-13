import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { MongoRepository } from '../database/repository';
import { Code, CodeDocument, CreateCodeSchema } from './schemas/code.schema';
import { CreateCodeDto } from './dto/create-code.dto';
import { CodeType } from './queries/code-filter.query';
import { toMongoObjectId } from 'src/utils/mongo';

@Injectable()
export class CodeRepository extends MongoRepository<
  CodeDocument,
  CreateCodeSchema
> {
  constructor(
    @InjectModel(Code.name)
    private readonly codeModel: Model<CodeDocument>,
  ) {
    super(codeModel);
  }
  createCode(
    createCodeDto: CreateCodeDto,
    value: string,
    session?: ClientSession,
  ) {
    const { userId, rewardId, invitationId, locationId } = createCodeDto;
    return this.create(
      {
        user: toMongoObjectId(userId),
        reward: rewardId ? toMongoObjectId(rewardId) : undefined,
        invitation: invitationId ? toMongoObjectId(invitationId) : undefined,
        locationId: locationId ? toMongoObjectId(locationId) : undefined,
        value,
      },
      session,
    );
  }
  findByRewardId(rewardId: string) {
    return this.find({ reward: toMongoObjectId(rewardId) });
  }

  findByRewardsIds(rewardsIds: string[]) {
    const validRewardsIds = rewardsIds.map((id) => new Types.ObjectId(id));
    return this.find({ reward: { $in: validRewardsIds } });
  }

  findByValue(value: string) {
    return this.codeModel
      .findOne({ value })
      .populate({
        path: 'invitation',
        populate: {
          path: 'referral',
        },
      })
      .populate({
        path: 'reward',
        populate: {
          path: 'place',
        },
      });
  }

  useCode(value: string) {
    return this.findOneAndUpdate({ value }, { usedAt: new Date() });
  }

  useCodeById(id: string, usedBy: string) {
    return this.findByIdAndUpdate(id, {
      usedAt: new Date(),
      usedBy: toMongoObjectId(usedBy),
    });
  }

  async findReferralCodes(userId: string) {
    const codes = await this.codeModel
      .find({ user: new Types.ObjectId(userId) })
      .populate({
        path: 'invitation',
        populate: {
          path: 'referral',
        },
      });

    return codes.filter((c) => c.invitation);
  }

  async findRewardCodes(userId: string) {
    const codes = await this.codeModel
      .find({ user: new Types.ObjectId(userId) })
      .populate({
        path: 'reward',
        populate: {
          path: 'event',
          populate: {
            path: 'place',
          },
        },
      });

    return codes.filter((c) => c.reward);
  }

  async findByRewardIdAndUserId(rewardId: string, userId: string) {
    return this.codeModel.findOne({
      user: toMongoObjectId(userId),
      reward: toMongoObjectId(rewardId),
    });
  }

  async findByUserId(userId: string) {
    return this.codeModel
      .find({ user: new Types.ObjectId(userId) })
      .populate({
        path: 'reward',
        populate: {
          path: 'event',
          populate: {
            path: 'place',
          },
        },
      })
      .populate({
        path: 'invitation',
        populate: {
          path: 'referral',
        },
      });
  }

  async findByRewardIdAndDelete(rewardId: string, session?: ClientSession) {
    return this.codeModel.deleteMany(
      { reward: new Types.ObjectId(rewardId) },
      { session },
    );
  }

  async findUnusedCodeByLocationIdAndUserId(
    locationId: string,
    userId: string,
  ) {
    return this.codeModel.findOne({
      locationId: toMongoObjectId(locationId),
      user: toMongoObjectId(userId),
      usedAt: { $exists: false },
    });
  }

  async findClientsByPlaceIds(
    placeIds: string[],
    page: number = 1,
    limit: number = 10,
    placeId?: string,
    locationId?: string,
    email?: string,
    minScans?: number,
    maxScans?: number,
    lastScanDateFrom?: string,
    lastScanDateTo?: string,
    sortBy: string = 'lastScanDate',
    sortOrder: string = 'desc',
  ) {
    const placeObjectIds = placeIds.map((id) => new Types.ObjectId(id));
    const skip = (page - 1) * limit;

    const pipeline = [
      {
        // Tylko kody które zostały użyte
        $match: {
          usedAt: { $exists: true },
        },
      },
      {
        // Populujemy reward żeby dostać się do place i locationId
        $lookup: {
          from: 'rewards',
          localField: 'reward',
          foreignField: '_id',
          as: 'rewardData',
        },
      },
      {
        $unwind: '$rewardData',
      },
      {
        $match: {
          'rewardData.place': placeId
            ? new Types.ObjectId(placeId)
            : { $in: placeObjectIds },
          ...(locationId && {
            'rewardData.locationIds': new Types.ObjectId(locationId),
          }),
        },
      },
      {
        $group: {
          _id: {
            userId: '$user',
            placeId: '$rewardData.place',
          },
          scanCount: { $sum: 1 },
          lastScanDate: { $max: '$usedAt' },
          firstScanDate: { $min: '$usedAt' },
        },
      },
      {
        $group: {
          _id: '$_id.userId',
          totalScans: { $sum: '$scanCount' },
          lastScanDate: { $max: '$lastScanDate' },
          firstScanDate: { $min: '$firstScanDate' },
          places: {
            $push: {
              placeId: '$_id.placeId',
              scanCount: '$scanCount',
            },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userData',
        },
      },
      {
        $unwind: '$userData',
      },
      {
        $match: {
          ...(email && {
            'userData.email': { $regex: email, $options: 'i' },
          }),
          ...((minScans !== undefined || maxScans !== undefined) && {
            totalScans: {
              ...(minScans !== undefined && { $gte: minScans }),
              ...(maxScans !== undefined && { $lte: maxScans }),
            },
          }),
          ...((lastScanDateFrom || lastScanDateTo) && {
            lastScanDate: {
              ...(lastScanDateFrom && { $gte: new Date(lastScanDateFrom) }),
              ...(lastScanDateTo && { $lte: new Date(lastScanDateTo) }),
            },
          }),
        },
      },
      {
        $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 },
      },
    ];

    const result = await this.codeModel.aggregate([
      ...(pipeline as any[]),
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          metadata: [{ $count: 'total' }],
        },
      },
    ]);

    return {
      data: result[0]?.data || [],
      total: result[0]?.metadata[0]?.total || 0,
    };
  }

  async findScanHistoryByRewardId(
    rewardId: string,
    start: number = 0,
    limit: number = 10,
  ) {
    const skip = start;

    const pipeline: any[] = [
      {
        $match: {
          reward: new Types.ObjectId(rewardId),
          usedAt: { $exists: true },
        },
      },
      {
        $sort: { usedAt: -1 },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'codeOwner',
        },
      },
      {
        $unwind: {
          path: '$codeOwner',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        // Populujemy dane rewarda żeby dostać się do place
        $lookup: {
          from: 'rewards',
          localField: 'reward',
          foreignField: '_id',
          as: 'rewardInfo',
        },
      },
      {
        $unwind: {
          path: '$rewardInfo',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'places',
          localField: 'rewardInfo.place',
          foreignField: '_id',
          as: 'placeInfo',
        },
      },
      {
        $unwind: {
          path: '$placeInfo',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'usedBy',
          foreignField: '_id',
          as: 'usedByUser',
        },
      },
      {
        $unwind: {
          path: '$usedByUser',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          scannedByEmployee: {
            $cond: {
              if: { $ne: ['$usedBy', null] },
              then: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: { $ifNull: ['$placeInfo.employees', []] },
                      as: 'emp',
                      cond: { $eq: ['$$emp.user', '$usedBy'] },
                    },
                  },
                  0,
                ],
              },
              else: null,
            },
          },
        },
      },
      {
        $addFields: {
          scannedByEmployee: {
            $cond: {
              if: { $ne: ['$scannedByEmployee', null] },
              then: {
                $mergeObjects: [
                  '$scannedByEmployee',
                  {
                    user: '$usedByUser',
                  },
                ],
              },
              else: null,
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          value: 1,
          usedAt: 1,
          usedBy: 1, // debug
          usedByUser: 1, // debug
          'placeInfo.employees': 1, // debug
          codeOwner: {
            _id: 1,
            firstName: 1,
            lastName: 1,
            email: 1,
            img: 1,
          },
          scannedBy: {
            $cond: {
              if: { $ne: ['$scannedByEmployee', null] },
              then: {
                _id: '$scannedByEmployee._id',
                role: '$scannedByEmployee.role',
                status: '$scannedByEmployee.status',
                email: '$scannedByEmployee.email',
                name: '$scannedByEmployee.name',
                user: {
                  _id: '$scannedByEmployee.user._id',
                  firstName: '$scannedByEmployee.user.firstName',
                  lastName: '$scannedByEmployee.user.lastName',
                  email: '$scannedByEmployee.user.email',
                  img: '$scannedByEmployee.user.img',
                },
              },
              else: null,
            },
          },
        },
      },
    ];

    const result = await this.codeModel.aggregate([
      ...pipeline,
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          metadata: [
            { $count: 'total' },
            {
              $addFields: {
                start: start,
                limit: limit,
              },
            },
          ],
        },
      },
    ]);

    const metadata = result[0]?.metadata[0] || { total: 0, start, limit };

    return {
      data: result[0]?.data || [],
      metadata: [
        {
          total: metadata.total || 0,
          start: start,
          limit: limit,
        },
      ],
    };
  }

  /**
   * Pobiera historię skanowanych kodów dla konkretnego klienta (user)
   * w place'ach należących do danego właściciela
   * @param clientUserId - ID klienta
   * @param placeIds - Lista ID place'ów należących do właściciela
   * @param page - Numer strony (zaczyna się od 1)
   * @param limit - Liczba elementów na stronę
   */
  async findScanHistoryByClientAndPlaceIds(
    clientUserId: string,
    placeIds: string[],
    page: number = 1,
    limit: number = 10,
  ) {
    const placeObjectIds = placeIds.map((id) => new Types.ObjectId(id));
    const skip = (page - 1) * limit;

    // Najpierw pobieramy wszystkie kody i filtrujemy
    const allCodes = await this.codeModel
      .find({
        user: toMongoObjectId(clientUserId),
        usedAt: { $exists: true },
      })
      .populate({
        path: 'reward',
        populate: {
          path: 'place',
        },
      })
      .populate('usedBy')
      .sort({ usedAt: -1 });

    // Filtrujemy tylko kody z place'ów użytkownika
    const filteredCodes = allCodes.filter((code) => {
      if (!code.reward || !code.reward.place) return false;
      return placeObjectIds.some(
        (id) => id.toString() === code.reward.place._id.toString(),
      );
    });

    // Zwracamy tylko odpowiednią stronę
    return {
      data: filteredCodes.slice(skip, skip + limit),
      total: filteredCodes.length,
    };
  }

  async countUserRewardUsage(
    rewardId: string,
    userId: string,
  ): Promise<number> {
    return this.codeModel.countDocuments({
      reward: toMongoObjectId(rewardId),
      user: toMongoObjectId(userId),
      usedAt: { $exists: true },
    });
  }

  async findUsedCodesByUserId(
    userId: string,
    start: number = 0,
    limit: number = 10,
  ) {
    const result = await this.codeModel.aggregate([
      {
        $match: {
          user: new Types.ObjectId(userId),
          usedAt: { $exists: true, $ne: null },
        },
      },
      {
        $sort: { usedAt: -1 },
      },
      {
        $facet: {
          data: [{ $skip: start }, { $limit: limit }],
          metadata: [{ $count: 'total' }],
        },
      },
      {
        $unwind: { path: '$data', preserveNullAndEmptyArrays: true },
      },
      {
        $lookup: {
          from: 'rewards',
          localField: 'data.reward',
          foreignField: '_id',
          as: 'rewardData',
        },
      },
      {
        $lookup: {
          from: 'places',
          let: {
            rewardPlaceId: { $arrayElemAt: ['$rewardData.place', 0] },
            locationId: '$data.locationId',
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ['$_id', '$$rewardPlaceId'] },
                    { $in: ['$$locationId', '$locations._id'] },
                  ],
                },
              },
            },
          ],
          as: 'placeData',
        },
      },
      {
        $group: {
          _id: null,
          data: {
            $push: {
              _id: '$data._id',
              value: '$data.value',
              createdAt: '$data.createdAt',
              usedAt: '$data.usedAt',
              reward: {
                $cond: {
                  if: { $gt: [{ $size: '$rewardData' }, 0] },
                  then: { name: { $arrayElemAt: ['$rewardData.name', 0] } },
                  else: null,
                },
              },
              location: {
                $switch: {
                  branches: [
                    {
                      case: { $eq: ['$data.locationId', null] },
                      then: null,
                    },
                    {
                      case: { $eq: [{ $size: '$rewardData' }, 0] },
                      then: {
                        $let: {
                          vars: {
                            place: { $arrayElemAt: ['$placeData', 0] },
                          },
                          in: {
                            $let: {
                              vars: {
                                foundLoc: {
                                  $arrayElemAt: [
                                    {
                                      $filter: {
                                        input: {
                                          $ifNull: ['$$place.locations', []],
                                        },
                                        as: 'loc',
                                        cond: {
                                          $eq: [
                                            '$$loc._id',
                                            '$data.locationId',
                                          ],
                                        },
                                      },
                                    },
                                    0,
                                  ],
                                },
                              },
                              in: {
                                $cond: {
                                  if: { $ne: ['$$foundLoc', null] },
                                  then: { address: '$$foundLoc.address' },
                                  else: null,
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  ],
                  default: null,
                },
              },
              place: {
                $let: {
                  vars: {
                    placeData: { $arrayElemAt: ['$placeData', 0] },
                  },
                  in: {
                    $cond: {
                      if: { $ne: ['$$placeData', null] },
                      then: {
                        logo: {
                          $concat: [
                            process.env.CLOUDI_URL || '',
                            '/',
                            '$$placeData.logo',
                          ],
                        },
                        name: '$$placeData.name',
                      },
                      else: null,
                    },
                  },
                },
              },
            },
          },
          metadata: { $first: '$metadata' },
        },
      },
      {
        $project: {
          _id: 0,
          data: 1,
          metadata: {
            $cond: {
              if: { $gt: [{ $size: '$metadata' }, 0] },
              then: {
                total: { $arrayElemAt: ['$metadata.total', 0] },
                start: start,
                limit: limit,
              },
              else: { total: 0, start: start, limit: limit },
            },
          },
        },
      },
    ]);

    return result[0] || { data: [], metadata: { total: 0, start, limit } };
  }
}
