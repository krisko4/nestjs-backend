import { toMongoObjectId } from 'src/utils/mongo';

export function getPaginatedEmployees(
  userId: string,
  start: number,
  limit: number,
) {
  return {
    metadata: [
      { $count: 'total' },
      {
        $addFields: {
          start,
          limit,
        },
      },
    ],
    data: [
      { $match: { 'employees.user': toMongoObjectId(userId) } },
      { $unwind: '$employees' },
      {
        $lookup: {
          from: 'users',
          localField: 'employees.user',
          foreignField: '_id',
          as: 'user',
          pipeline: [{ $project: { email: 1, img: 1 } }],
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          user: '$user',
          role: '$employees.role',
          email: '$employees.email',
          status: '$employees.status',
          place: {
            _id: '$_id',
            name: '$name',
          },
        },
      },
      { $skip: start },
      { $limit: limit },
    ],
  };
}
