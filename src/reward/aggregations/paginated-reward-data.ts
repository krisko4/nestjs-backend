import { Model, FilterQuery, Types } from 'mongoose';
import { RewardDocument } from '../schemas/reward.schema';

export function getPaginatedRewardData(
  start: number,
  limit: number,
  entityFilterQuery: FilterQuery<Model<RewardDocument>>,
) {
  const { userId, ...rest } = entityFilterQuery;
  const dataPipeline: any[] = [
    { $match: rest },
    {
      $lookup: {
        from: 'places',
        localField: 'place',
        foreignField: '_id',
        as: 'place',
      },
    },
  ];

  if (userId) {
    dataPipeline.push({
      $match: {
        'place.userId':
          typeof userId === 'string' ? new Types.ObjectId(userId) : userId,
      },
    });
  }

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
      $project: {
        name: 1,
        description: 1,
        availableFor: 1,
        createdAt: 1,
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
        locationId: 1,
        startDate: 1,
        endDate: 1,
        participators: 1,
        title: 1,
        content: 1,
        img: 1,
      },
    },
  );

  const metadataPipeline: any[] = [
    { $match: rest },
    {
      $lookup: {
        from: 'places',
        localField: 'place',
        foreignField: '_id',
        as: 'place',
      },
    },
  ];

  if (userId) {
    metadataPipeline.push({
      $match: {
        'place.userId':
          typeof userId === 'string' ? new Types.ObjectId(userId) : userId,
      },
    });
  }

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
