import { Model, FilterQuery } from 'mongoose';
import { EventDocument } from '../schemas/event.schema';
export function getPaginatedEventData(
  start: number,
  limit: number,
  entityFilterQuery: FilterQuery<Model<EventDocument>>,
) {
  return {
    metadata: [
      { $count: 'total' },
      {
        $addFields: {
          start: start,
          limit: limit,
        },
      },
    ],
    data: [
      { $match: entityFilterQuery },
      { $skip: start },
      { $limit: limit },
      {
        $lookup: {
          from: 'places',
          localField: 'place',
          foreignField: '_id',
          as: 'place',
        },
      },
      {
        $project: {
          place: { $arrayElemAt: ['$place', 0] },
          locationId: 1,
          startDate: 1,
          endDate: 1,
          participators: 1,
          title: 1,
          content: 1,
          img: 1,
        },
      },
    ],
  };
}
