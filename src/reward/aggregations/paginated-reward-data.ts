import { Model, FilterQuery, Types } from 'mongoose';
import {
  RewardAvailableFor,
  RewardDocument,
  RewardStatus,
} from '../schemas/reward.schema';

function buildBasePipeline(
  entityFilterQuery: FilterQuery<Model<RewardDocument>>,
  countryCode?: string,
  locationIds?: Types.ObjectId[],
  filterByActiveStatus: boolean = false,
  searchUserId?: string,
  favoriteLocationIds?: string[],
) {
  const { userId, ...rest } = entityFilterQuery;
  const matchConditions: any = { ...rest };

  if (filterByActiveStatus) {
    matchConditions.status = RewardStatus.ACTIVE;
  }

  const pipeline: any[] = [{ $match: matchConditions }];

  if (userId) {
    pipeline.push(
      {
        $lookup: {
          from: 'employees',
          let: { rewardLocationIds: '$locationIds' },
          pipeline: [
            {
              $match: {
                user:
                  typeof userId === 'string'
                    ? new Types.ObjectId(userId)
                    : userId,
              },
            },
            {
              $unwind: '$places',
            },
            {
              $unwind: '$places.locations',
            },
            {
              $match: {
                $expr: {
                  $in: ['$places.locations.locationId', '$$rewardLocationIds'],
                },
              },
            },
          ],
          as: 'employeeData',
        },
      },
      {
        $match: {
          employeeData: { $ne: [] },
        },
      },
      {
        $project: {
          employeeData: 0,
        },
      },
    );
  }

  pipeline.push({
    $lookup: {
      from: 'places',
      localField: 'place',
      foreignField: '_id',
      as: 'place',
    },
  });

  if (locationIds && locationIds.length > 0) {
    pipeline.push({
      $match: {
        locationIds: {
          $in: locationIds,
        },
      },
    });
  } else if (countryCode) {
    pipeline.push({
      $lookup: {
        from: 'locations',
        localField: 'locationIds',
        foreignField: '_id',
        as: 'locationData',
      },
    });
    pipeline.push({
      $match: {
        'locationData.countryCode': countryCode,
      },
    });
  }

  if (searchUserId && favoriteLocationIds) {
    const favoriteLocationObjectIds = favoriteLocationIds.map(
      (id) => new Types.ObjectId(id),
    );
    const searchUserObjectId = new Types.ObjectId(searchUserId);

    pipeline.push({
      $match: {
        $or: [
          { availableFor: RewardAvailableFor.ALL },
          {
            availableFor: RewardAvailableFor.SUBSCRIBERS,
            locationIds: { $in: favoriteLocationObjectIds },
          },
          {
            availableFor: RewardAvailableFor.SELECTED_USERS,
            selectedUserIds: searchUserObjectId,
          },
        ],
      },
    });

    pipeline.push({
      $addFields: {
        availableForPriority: {
          $switch: {
            branches: [
              {
                case: {
                  $eq: ['$availableFor', RewardAvailableFor.SELECTED_USERS],
                },
                then: 1,
              },
              {
                case: {
                  $eq: ['$availableFor', RewardAvailableFor.SUBSCRIBERS],
                },
                then: 2,
              },
              {
                case: { $eq: ['$availableFor', RewardAvailableFor.ALL] },
                then: 3,
              },
            ],
            default: 4,
          },
        },
      },
    });

    pipeline.push({
      $sort: { availableForPriority: 1 },
    });
  }

  return pipeline;
}

export function getPaginatedRewardData(
  start: number,
  limit: number,
  entityFilterQuery: FilterQuery<Model<RewardDocument>>,
  countryCode?: string,
  locationIds?: Types.ObjectId[],
  filterByActiveStatus: boolean = false,
  searchUserId?: string,
  favoriteLocationIds?: string[],
) {
  const dataPipeline = buildBasePipeline(
    entityFilterQuery,
    countryCode,
    locationIds,
    filterByActiveStatus,
    searchUserId,
    favoriteLocationIds,
  );

  dataPipeline.push(
    { $skip: start },
    { $limit: limit },
    {
      $lookup: {
        from: 'events',
        localField: 'event',
        foreignField: '_id',
        as: 'event',
      },
    },
    {
      $lookup: {
        from: 'codes',
        localField: '_id',
        foreignField: 'reward',
        as: 'codes',
      },
    },
    {
      $addFields: {
        totalScans: {
          $size: {
            $filter: {
              input: '$codes',
              as: 'code',
              cond: {
                $and: [
                  { $ne: ['$$code.usedAt', null] },
                  { $ne: [{ $type: '$$code.usedAt' }, 'missing'] },
                ],
              },
            },
          },
        },
      },
    },
    {
      $unset: 'availableForPriority', // Remove helper field
    },
    {
      $project: {
        name: 1,
        description: 1,
        availableFor: 1,
        status: 1,
        createdAt: 1,
        totalScans: 1,
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
        event: { $arrayElemAt: ['$event', 0] },
        locationIds: 1,
        startDate: 1,
        endDate: 1,
        participators: 1,
        usageLimit: 1,
        userLimit: 1,
        lastScanDate: 1,
        title: 1,
        content: 1,
        img: 1,
      },
    },
  );

  const metadataPipeline = buildBasePipeline(
    entityFilterQuery,
    countryCode,
    locationIds,
    filterByActiveStatus,
    searchUserId,
    favoriteLocationIds,
  );

  metadataPipeline.push(
    { $count: 'total' },
    {
      $addFields: {
        start: start,
        limit: limit,
      },
    },
  );

  return {
    metadata: metadataPipeline,
    data: dataPipeline,
  };
}
