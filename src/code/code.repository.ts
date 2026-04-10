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
    const { userId, rewardId, locationId } = createCodeDto;
    return this.create(
      {
        user: toMongoObjectId(userId),
        reward: rewardId ? toMongoObjectId(rewardId) : undefined,
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
    return this.codeModel.findOne({ value }).populate({
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

  updateLocationId(id: string, locationId: string) {
    return this.findByIdAndUpdate(id, {
      locationId: toMongoObjectId(locationId),
    });
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
    return this.codeModel.find({ user: new Types.ObjectId(userId) }).populate({
      path: 'reward',
      populate: {
        path: 'event',
        populate: {
          path: 'place',
        },
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
    start: number = 0,
    limit: number = 10,
    placeId?: string,
    locationIds?: string[],
    email?: string,
    minScans?: number,
    maxScans?: number,
    lastScanDateFrom?: string,
    lastScanDateTo?: string,
    sortBy: string = 'lastScanDate',
    sortOrder: string = 'desc',
  ) {
    const placeObjectIds = placeIds.map((id) => new Types.ObjectId(id));
    const skip = start;

    const pipeline = [
      {
        $match: {
          usedAt: { $exists: true },
        },
      },
      {
        $lookup: {
          from: 'rewards',
          localField: 'reward',
          foreignField: '_id',
          as: 'rewardData',
        },
      },
      {
        $unwind: {
          path: '$rewardData',
          preserveNullAndEmptyArrays: true,
        },
      },
      // Lookup place from locationId for codes without rewards
      {
        $lookup: {
          from: 'places',
          let: { locationId: '$locationId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ['$$locationId', '$locations._id'],
                },
              },
            },
          ],
          as: 'placeFromLocation',
        },
      },
      {
        $unwind: {
          path: '$placeFromLocation',
          preserveNullAndEmptyArrays: true,
        },
      },
      // Determine which place to use (from reward or from locationId)
      {
        $addFields: {
          finalPlaceId: {
            $cond: {
              if: { $ne: [{ $ifNull: ['$reward', null] }, null] },
              then: '$rewardData.place',
              else: '$placeFromLocation._id',
            },
          },
        },
      },
      {
        $match: {
          finalPlaceId: placeId
            ? new Types.ObjectId(placeId)
            : { $in: placeObjectIds },
          ...(locationIds &&
            locationIds.length > 0 && {
              $or: [
                {
                  'rewardData.locationIds': {
                    $in: locationIds.map((id) => new Types.ObjectId(id)),
                  },
                },
                {
                  locationId: {
                    $in: locationIds.map((id) => new Types.ObjectId(id)),
                  },
                },
              ],
            }),
        },
      },
      {
        $group: {
          _id: {
            userId: '$user',
            placeId: '$finalPlaceId',
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
              ...(lastScanDateFrom && {
                $gte: new Date(new Date(lastScanDateFrom).setHours(0, 0, 0, 0)),
              }),
              ...(lastScanDateTo && {
                $lte: new Date(
                  new Date(lastScanDateTo).setHours(23, 59, 59, 999),
                ),
              }),
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
        // Lookup Employee to get employee info from embedded places array
        $lookup: {
          from: 'employees',
          let: {
            placeId: '$placeInfo._id',
            userId: '$usedBy',
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$user', '$$userId'],
                },
              },
            },
            {
              $unwind: '$places',
            },
            {
              $match: {
                $expr: {
                  $eq: ['$places.place', '$$placeId'],
                },
              },
            },
            {
              $project: {
                _id: 1,
                name: '$places.name',
              },
            },
          ],
          as: 'employeeData',
        },
      },
      {
        $addFields: {
          placeEmployee: {
            $arrayElemAt: ['$employeeData', 0],
          },
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
      // Find location in placeInfo.locations based on locationId
      {
        $addFields: {
          location: {
            $cond: {
              if: {
                $and: [
                  { $ne: ['$locationId', null] },
                  { $ne: ['$placeInfo', null] },
                  { $isArray: '$placeInfo.locations' },
                ],
              },
              then: {
                $let: {
                  vars: {
                    foundLocation: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: '$placeInfo.locations',
                            as: 'loc',
                            cond: { $eq: ['$$loc._id', '$locationId'] },
                          },
                        },
                        0,
                      ],
                    },
                  },
                  in: {
                    $cond: {
                      if: { $ne: ['$$foundLocation', null] },
                      then: {
                        _id: '$$foundLocation._id',
                        address: '$$foundLocation.address',
                      },
                      else: null,
                    },
                  },
                },
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
          location: 1,
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
                placeEmployeeId: '$placeEmployee._id',
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

  async findScanHistoryByClientAndPlaceIds(
    clientUserId: string,
    placeIds: string[],
    start: number = 0,
    limit: number = 10,
  ) {
    const placeObjectIds = placeIds.map((id) => new Types.ObjectId(id));
    const skip = start;

    const pipeline: any[] = [
      {
        $match: {
          user: toMongoObjectId(clientUserId),
          usedAt: { $exists: true },
        },
      },
      {
        $sort: { usedAt: -1 },
      },
      {
        $lookup: {
          from: 'rewards',
          localField: 'reward',
          foreignField: '_id',
          as: 'rewardData',
        },
      },
      {
        $unwind: {
          path: '$rewardData',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'places',
          localField: 'rewardData.place',
          foreignField: '_id',
          as: 'placeFromReward',
        },
      },
      {
        $unwind: {
          path: '$placeFromReward',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'places',
          let: { locationId: '$locationId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ['$$locationId', '$locations._id'],
                },
              },
            },
          ],
          as: 'placeFromLocation',
        },
      },
      {
        $unwind: {
          path: '$placeFromLocation',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'usedBy',
          foreignField: '_id',
          as: 'usedByData',
        },
      },
      {
        $unwind: {
          path: '$usedByData',
          preserveNullAndEmptyArrays: true,
        },
      },
      // Determine which place to use
      {
        $addFields: {
          finalPlace: {
            $cond: {
              if: { $ne: [{ $ifNull: ['$placeFromReward', null] }, null] },
              then: '$placeFromReward',
              else: '$placeFromLocation',
            },
          },
        },
      },
      // Lookup Employee to get employee info from embedded places array
      {
        $lookup: {
          from: 'employees',
          let: {
            placeId: '$finalPlace._id',
            userId: '$usedByData._id',
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ['$user', '$$userId'],
                },
              },
            },
            {
              $unwind: '$places',
            },
            {
              $match: {
                $expr: {
                  $eq: ['$places.place', '$$placeId'],
                },
              },
            },
            {
              $project: {
                _id: 1,
                name: '$places.name',
              },
            },
          ],
          as: 'employeeData',
        },
      },
      {
        $addFields: {
          placeEmployee: {
            $arrayElemAt: ['$employeeData', 0],
          },
        },
      },
      // Find location in finalPlace.locations based on locationId
      {
        $addFields: {
          location: {
            $cond: {
              if: {
                $and: [
                  { $ne: ['$locationId', null] },
                  { $ne: ['$finalPlace', null] },
                  { $isArray: '$finalPlace.locations' },
                ],
              },
              then: {
                $let: {
                  vars: {
                    foundLocation: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: '$finalPlace.locations',
                            as: 'loc',
                            cond: { $eq: ['$$loc._id', '$locationId'] },
                          },
                        },
                        0,
                      ],
                    },
                  },
                  in: {
                    $cond: {
                      if: { $ne: ['$$foundLocation', null] },
                      then: {
                        _id: '$$foundLocation._id',
                        address: '$$foundLocation.address',
                      },
                      else: null,
                    },
                  },
                },
              },
              else: null,
            },
          },
        },
      },
      // Filter by placeIds
      {
        $match: {
          'finalPlace._id': { $in: placeObjectIds },
        },
      },
      // Project final structure
      {
        $project: {
          _id: 1,
          value: 1,
          usedAt: 1,
          locationId: 1,
          usedBy: '$usedByData',
          placeEmployee: 1,
          location: 1,
          reward: '$rewardData',
          place: '$finalPlace',
        },
      },
    ];

    const result = await this.codeModel.aggregate([
      ...pipeline,
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

  async findScanHistoryByUserId(
    scannedByUserId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    // Agregacja MongoDB dla historii skanów wykonanych przez danego użytkownika
    const pipeline: any[] = [
      {
        $match: {
          usedBy: toMongoObjectId(scannedByUserId),
          usedAt: { $exists: true },
        },
      },
      {
        $sort: { usedAt: -1 },
      },
      // Populate reward
      {
        $lookup: {
          from: 'rewards',
          localField: 'reward',
          foreignField: '_id',
          as: 'rewardData',
        },
      },
      {
        $unwind: {
          path: '$rewardData',
          preserveNullAndEmptyArrays: true,
        },
      },
      // Populate place from reward
      {
        $lookup: {
          from: 'places',
          localField: 'rewardData.place',
          foreignField: '_id',
          as: 'placeFromReward',
        },
      },
      {
        $unwind: {
          path: '$placeFromReward',
          preserveNullAndEmptyArrays: true,
        },
      },
      // Populate place from locationId (jeśli reward nie istnieje)
      {
        $lookup: {
          from: 'places',
          let: { locationId: '$locationId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ['$$locationId', '$locations._id'],
                },
              },
            },
          ],
          as: 'placeFromLocation',
        },
      },
      {
        $unwind: {
          path: '$placeFromLocation',
          preserveNullAndEmptyArrays: true,
        },
      },
      // Populate user (właściciel kodu)
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userData',
        },
      },
      {
        $unwind: {
          path: '$userData',
          preserveNullAndEmptyArrays: true,
        },
      },
      // Determine which place to use
      {
        $addFields: {
          finalPlace: {
            $cond: {
              if: { $ne: [{ $ifNull: ['$placeFromReward', null] }, null] },
              then: '$placeFromReward',
              else: '$placeFromLocation',
            },
          },
        },
      },
      // Find location in finalPlace.locations based on locationId
      {
        $addFields: {
          location: {
            $cond: {
              if: {
                $and: [
                  { $ne: ['$locationId', null] },
                  { $ne: ['$finalPlace', null] },
                  { $isArray: '$finalPlace.locations' },
                ],
              },
              then: {
                $let: {
                  vars: {
                    foundLocation: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: '$finalPlace.locations',
                            as: 'loc',
                            cond: { $eq: ['$$loc._id', '$locationId'] },
                          },
                        },
                        0,
                      ],
                    },
                  },
                  in: {
                    $cond: {
                      if: { $ne: ['$$foundLocation', null] },
                      then: {
                        _id: '$$foundLocation._id',
                        address: '$$foundLocation.address',
                      },
                      else: null,
                    },
                  },
                },
              },
              else: null,
            },
          },
        },
      },
      // Project final structure
      {
        $project: {
          _id: 1,
          value: 1,
          usedAt: 1,
          locationId: 1,
          user: {
            _id: '$userData._id',
            email: '$userData.email',
          },
          reward: '$rewardData',
          place: '$finalPlace',
        },
      },
    ];

    const result = await this.codeModel.aggregate([
      ...pipeline,
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

  async countRewardUsage(rewardId: string): Promise<number> {
    return this.codeModel.countDocuments({
      reward: toMongoObjectId(rewardId),
      usedAt: { $exists: true },
    });
  }

  async findUsedCodesByUserId(
    userId: string,
    start: number = 0,
    limit: number = 10,
  ) {
    const skip = start;

    const pipeline: any[] = [
      // Match codes that belong to the user and have been scanned
      {
        $match: {
          user: toMongoObjectId(userId),
          usedAt: { $exists: true, $ne: null },
        },
      },
      {
        $sort: { usedAt: -1 },
      },
      // Lookup reward
      {
        $lookup: {
          from: 'rewards',
          localField: 'reward',
          foreignField: '_id',
          as: 'rewardData',
        },
      },
      {
        $addFields: {
          rewardData: {
            $cond: {
              if: { $gt: [{ $size: '$rewardData' }, 0] },
              then: { $arrayElemAt: ['$rewardData', 0] },
              else: null,
            },
          },
        },
      },
      // Lookup place based on locationId (always present)
      {
        $lookup: {
          from: 'places',
          let: { locationId: '$locationId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ['$$locationId', '$locations._id'],
                },
              },
            },
          ],
          as: 'placeData',
        },
      },
      {
        $unwind: {
          path: '$placeData',
          preserveNullAndEmptyArrays: true,
        },
      },
      // Find location in placeData.locations based on locationId
      {
        $addFields: {
          locationData: {
            $arrayElemAt: [
              {
                $filter: {
                  input: { $ifNull: ['$placeData.locations', []] },
                  as: 'loc',
                  cond: { $eq: ['$$loc._id', '$locationId'] },
                },
              },
              0,
            ],
          },
        },
      },
      // Project final structure
      {
        $project: {
          _id: 1,
          value: 1,
          createdAt: 1,
          usedAt: 1,
          reward: {
            $cond: {
              if: { $ne: ['$rewardData', null] },
              then: {
                name: '$rewardData.name',
              },
              else: null,
            },
          },
          location: {
            $cond: {
              if: { $ne: ['$locationData', null] },
              then: {
                address: '$locationData.address',
              },
              else: null,
            },
          },
          place: {
            $cond: {
              if: { $ne: ['$placeData', null] },
              then: {
                name: '$placeData.name',
                logo: {
                  $concat: [
                    process.env.CLOUDI_URL || '',
                    '/',
                    '$placeData.logo',
                  ],
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
          metadata: [{ $count: 'total' }],
        },
      },
    ]);

    return {
      data: result[0]?.data || [],
      metadata: {
        total: result[0]?.metadata[0]?.total || 0,
        start,
        limit,
      },
    };
  }

  async findActiveUsersByPlace(
    placeId: string,
    locationIds: string[],
    limit: number,
    sortOrder: 'asc' | 'desc' = 'desc',
  ): Promise<Array<{ _id: string; scanCount: number }>> {
    const locationObjectIds = locationIds.map((id) => new Types.ObjectId(id));

    const result = await this.codeModel.aggregate([
      {
        $lookup: {
          from: 'rewards',
          localField: 'reward',
          foreignField: '_id',
          as: 'rewardData',
        },
      },
      {
        $unwind: {
          path: '$rewardData',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'places',
          let: { locationId: '$locationId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ['$$locationId', '$locations._id'],
                },
              },
            },
          ],
          as: 'placeFromLocation',
        },
      },
      {
        $unwind: {
          path: '$placeFromLocation',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          finalPlaceId: {
            $cond: {
              if: { $ne: [{ $ifNull: ['$reward', null] }, null] },
              then: '$rewardData.place',
              else: '$placeFromLocation._id',
            },
          },
        },
      },
      {
        $match: {
          finalPlaceId: new Types.ObjectId(placeId),
          locationId: { $in: locationObjectIds },
          usedAt: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: '$user',
          scanCount: { $sum: 1 },
        },
      },
      {
        $sort: { scanCount: sortOrder === 'desc' ? -1 : 1 },
      },
      {
        $limit: limit,
      },
      {
        $project: {
          _id: { $toString: '$_id' },
          scanCount: 1,
        },
      },
    ]);

    return result;
  }

  async findTopActiveUsersByPlace(
    placeId: string,
    locationIds: string[],
    limit: number,
  ): Promise<Array<{ _id: string; scanCount: number }>> {
    return this.findActiveUsersByPlace(placeId, locationIds, limit, 'desc');
  }

  async findLeastActiveUsersByPlace(
    placeId: string,
    locationIds: string[],
    limit: number,
  ): Promise<Array<{ _id: string; scanCount: number }>> {
    return this.findActiveUsersByPlace(placeId, locationIds, limit, 'asc');
  }

  async findAllClientsByPlace(
    placeId: string,
    locationIds: string[],
  ): Promise<string[]> {
    const locationObjectIds = locationIds.map((id) => new Types.ObjectId(id));

    const result = await this.codeModel.aggregate([
      {
        $lookup: {
          from: 'rewards',
          localField: 'reward',
          foreignField: '_id',
          as: 'rewardData',
        },
      },
      {
        $unwind: {
          path: '$rewardData',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'places',
          let: { locationId: '$locationId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ['$$locationId', '$locations._id'],
                },
              },
            },
          ],
          as: 'placeFromLocation',
        },
      },
      {
        $unwind: {
          path: '$placeFromLocation',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          finalPlaceId: {
            $cond: {
              if: { $ne: [{ $ifNull: ['$reward', null] }, null] },
              then: '$rewardData.place',
              else: '$placeFromLocation._id',
            },
          },
        },
      },
      {
        $match: {
          finalPlaceId: new Types.ObjectId(placeId),
          locationId: { $in: locationObjectIds },
          usedAt: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: '$user',
        },
      },
      {
        $project: {
          _id: { $toString: '$_id' },
        },
      },
    ]);

    return result.map((r) => r._id);
  }

  async findInactiveClientsByPlace(
    placeId: string,
    locationIds: string[],
    lastScanDate: string,
  ): Promise<string[]> {
    const locationObjectIds = locationIds.map((id) => new Types.ObjectId(id));
    const lastScanDateObj = new Date(lastScanDate);

    // Find all clients who have scanned at the place
    const allClients = await this.findAllClientsByPlace(placeId, locationIds);

    if (allClients.length === 0) {
      return [];
    }

    const allClientObjectIds = allClients.map((id) => new Types.ObjectId(id));

    const activeClients = await this.codeModel.aggregate([
      {
        $lookup: {
          from: 'rewards',
          localField: 'reward',
          foreignField: '_id',
          as: 'rewardData',
        },
      },
      {
        $unwind: {
          path: '$rewardData',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'places',
          let: { locationId: '$locationId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ['$$locationId', '$locations._id'],
                },
              },
            },
          ],
          as: 'placeFromLocation',
        },
      },
      {
        $unwind: {
          path: '$placeFromLocation',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          finalPlaceId: {
            $cond: {
              if: { $ne: [{ $ifNull: ['$reward', null] }, null] },
              then: '$rewardData.place',
              else: '$placeFromLocation._id',
            },
          },
        },
      },
      {
        $match: {
          finalPlaceId: new Types.ObjectId(placeId),
          locationId: { $in: locationObjectIds },
          usedAt: { $exists: true, $ne: null, $gte: lastScanDateObj },
          user: { $in: allClientObjectIds },
        },
      },
      {
        $group: {
          _id: '$user',
        },
      },
      {
        $project: {
          _id: { $toString: '$_id' },
        },
      },
    ]);

    const activeClientIds = new Set(activeClients.map((c) => c._id));

    const inactiveClients = allClients.filter(
      (clientId) => !activeClientIds.has(clientId),
    );

    return inactiveClients;
  }

  async getPlacesByClientId(clientId: string): Promise<string[]> {
    const result = await this.codeModel.aggregate([
      {
        $match: {
          user: new Types.ObjectId(clientId),
          usedAt: { $exists: true, $ne: null },
        },
      },
      {
        $lookup: {
          from: 'rewards',
          localField: 'reward',
          foreignField: '_id',
          as: 'rewardData',
        },
      },
      {
        $unwind: {
          path: '$rewardData',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'places',
          let: { locationId: '$locationId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ['$$locationId', '$locations._id'],
                },
              },
            },
          ],
          as: 'placeFromLocation',
        },
      },
      {
        $unwind: {
          path: '$placeFromLocation',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          finalPlaceId: {
            $cond: {
              if: { $ne: [{ $ifNull: ['$reward', null] }, null] },
              then: '$rewardData.place',
              else: '$placeFromLocation._id',
            },
          },
        },
      },
      {
        $group: {
          _id: '$finalPlaceId',
        },
      },
      {
        $project: {
          _id: { $toString: '$_id' },
        },
      },
    ]);

    return result.map((r) => r._id);
  }
}
