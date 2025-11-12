import { Model, FilterQuery, Types } from 'mongoose';
import { EventDocument } from '../schemas/event.schema';

function buildBasePipeline(
  entityFilterQuery: FilterQuery<Model<EventDocument>>,
  countryCode?: string,
  locationIds?: Types.ObjectId[],
) {
  const { userId, ...rest } = entityFilterQuery;
  const pipeline: any[] = [{ $match: rest }];

  if (userId) {
    // Filtruj eventy gdzie użytkownik jest employeem przynajmniej jednej z lokalizacji eventu
    // Struktura: User -> Employee -> PlaceEmployee -> Location
    pipeline.push(
      {
        $lookup: {
          from: 'placeemployees',
          let: { eventLocationIds: '$locationIds' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ['$location', '$$eventLocationIds'],
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

export function getPaginatedEventData(
  start: number,
  limit: number,
  entityFilterQuery: FilterQuery<Model<EventDocument>>,
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
      $project: {
        locationIds: 1,
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
