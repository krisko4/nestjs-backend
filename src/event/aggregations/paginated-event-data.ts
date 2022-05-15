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
    data: [{ $match: entityFilterQuery }, { $skip: start }, { $limit: limit }],
  };
}
