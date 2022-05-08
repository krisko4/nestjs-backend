import { PipelineStage } from 'mongoose';
export function getOpinionsFacet(
  start: Date,
  end: Date,
): Record<string, PipelineStage.FacetPipelineStage[]> {
  return {
    today: [
      {
        $match: {
          date: { $gte: start, $lt: end },
        },
      },
      { $group: { _id: null, today: { $count: {} } } },
      { $project: { _id: 0 } },
    ],
    total: [
      { $group: { _id: null, total: { $count: {} } } },
      { $project: { _id: 0 } },
    ],
    data: [
      { $sort: { date: 1 } },
      {
        $lookup: {
          from: 'places',
          localField: 'locationId',
          foreignField: 'locations._id',
          as: 'name',
        },
      },
      {
        $set: {
          name: { $arrayElemAt: ['$name.name', 0] },
        },
      },
      {
        $group: {
          _id: '$locationId',
          name: { $first: '$name' },
          opinions: {
            $push: {
              date: '$date',
              author: '$author',
              note: '$note',
              content: '$content',
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
        },
      },
    ],
  };
}
