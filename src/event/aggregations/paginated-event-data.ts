import { Model, FilterQuery, Types } from 'mongoose';
import { EventDocument } from '../schemas/event.schema';

export function getPaginatedEventData(
  start: number,
  limit: number,
  entityFilterQuery: FilterQuery<Model<EventDocument>>,
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
        'place.employees.user':
          typeof userId === 'string' ? new Types.ObjectId(userId) : userId,
      },
    });
  }

  dataPipeline.push(
    { $skip: start },
    { $limit: limit },
    {
      $project: {
        locationId: 1,
        startDate: 1,
        endDate: 1,
        participators: 1,
        title: 1,
        content: 1,
        img: 1,
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
        'place.employees.user':
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
