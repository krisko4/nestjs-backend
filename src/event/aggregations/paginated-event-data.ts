import { Model, FilterQuery, Types } from 'mongoose';
import { EventDocument } from '../schemas/event.schema';

function buildBasePipeline(
  entityFilterQuery: FilterQuery<Model<EventDocument>>,
  countryCode?: string,
  locationIds?: Types.ObjectId[],
  activeOnly?: boolean,
) {
  const { userId, ...rest } = entityFilterQuery;
  const pipeline: any[] = [{ $match: rest }];

  if (activeOnly) {
    pipeline.push({
      $match: {
        $or: [
          { endDate: { $gte: new Date() } },
          { endDate: { $eq: null } },
          { endDate: { $exists: false } },
        ],
      },
    });
  }

  if (userId) {
    // Filtruj eventy gdzie użytkownik jest employeem przynajmniej jednej z lokalizacji eventu
    // Nowa struktura: User -> Employee -> places[] -> locations[]
    pipeline.push(
      {
        $lookup: {
          from: 'employees',
          let: { eventLocationIds: '$locationIds' },
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
                  $in: ['$places.locations.locationId', '$$eventLocationIds'],
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

export function getPaginatedEventData(
  start: number,
  limit: number,
  entityFilterQuery: FilterQuery<Model<EventDocument>>,
  locationFilter?: { lat?: number; lng?: number }, // Deprecated - nie używamy już
  countryCode?: string,
  locationIds?: Types.ObjectId[],
  activeOnly?: boolean,
) {
  const dataPipeline = buildBasePipeline(
    entityFilterQuery,
    countryCode,
    locationIds,
    activeOnly,
  );

  dataPipeline.push(
    { $skip: start },
    { $limit: limit },
    {
      $project: {
        locationIds: 1,
        status: 1,
        startDate: 1,
        endDate: 1,
        participators: 1,
        title: 1,
        content: 1,
        img: {
          $cond: {
            if: { $ne: ['$img', null] },
            then: {
              $concat: [`${process.env.CLOUDI_URL}/`, '$img'],
            },
            else: null,
          },
        },
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

  const metadataPipeline = buildBasePipeline(
    entityFilterQuery,
    countryCode,
    locationIds,
    activeOnly,
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
