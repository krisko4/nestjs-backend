import { Model, FilterQuery, Types } from 'mongoose';
import { RewardDocument } from '../schemas/reward.schema';

function buildBasePipeline(
  entityFilterQuery: FilterQuery<Model<RewardDocument>>,
  countryCode?: string,
  locationIds?: Types.ObjectId[],
) {
  const { userId, ...rest } = entityFilterQuery;
  const pipeline: any[] = [{ $match: rest }];

  if (userId) {
    // Filtruj rewardy gdzie użytkownik jest employeem przynajmniej jednej z lokalizacji rewarda
    // Struktura: User -> Employee -> PlaceEmployee -> Location
    pipeline.push(
      {
        $lookup: {
          from: 'placeemployees',
          let: { rewardLocationIds: '$locationIds' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ['$location', '$$rewardLocationIds'],
                },
              },
            },
            {
              $lookup: {
                from: 'employees',
                localField: 'employee',
                foreignField: '_id',
                as: 'employeeData',
              },
            },
            {
              $unwind: '$employeeData',
            },
            {
              $match: {
                'employeeData.user':
                  typeof userId === 'string'
                    ? new Types.ObjectId(userId)
                    : userId,
              },
            },
          ],
          as: 'placeEmployee',
        },
      },
      {
        $match: {
          placeEmployee: { $ne: [] },
        },
      },
      {
        $project: {
          placeEmployee: 0,
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
        locationIds: { $in: locationIds },
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

  return pipeline;
}

export function getPaginatedRewardData(
  start: number,
  limit: number,
  entityFilterQuery: FilterQuery<Model<RewardDocument>>,
  locationFilter?: { lat?: number; lng?: number }, // Deprecated - nie używamy już
  countryCode?: string,
  locationIds?: Types.ObjectId[],
) {
  const dataPipeline = buildBasePipeline(
    entityFilterQuery,
    countryCode,
    locationIds,
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
              cond: { $ne: ['$$code.usedAt', null] },
            },
          },
        },
      },
    },
    {
      $project: {
        name: 1,
        description: 1,
        availableFor: 1,
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
