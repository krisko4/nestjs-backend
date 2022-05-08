import { PipelineStage } from 'mongoose';

export function getVisitsFacet(
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
      { $group: { _id: null, today: { $sum: '$visitCount' } } },
      { $project: { _id: 0 } },
    ],
    total: [
      { $group: { _id: null, total: { $sum: '$visitCount' } } },
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
          visits: { $push: { date: '$date', visitCount: '$visitCount' } },
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
