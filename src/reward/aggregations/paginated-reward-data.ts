import { Model, FilterQuery, Types } from 'mongoose';
import { RewardDocument } from '../schemas/reward.schema';

const RADIUS_IN_METERS = 15000; // 15 km

const haversineFunction = function (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const R = 6378137;
  const toRad = (x: number) => (x * Math.PI) / 180.0;
  const hav = (x: number) => Math.pow(Math.sin(x / 2), 2);
  const aLat = toRad(lat1);
  const bLat = toRad(lat2);
  const aLng = toRad(lng1);
  const bLng = toRad(lng2);
  const ht =
    hav(bLat - aLat) + Math.cos(aLat) * Math.cos(bLat) * hav(bLng - aLng);
  return 2 * R * Math.asin(Math.sqrt(ht));
}.toString();

function buildLocationFilterStages(locationFilter: {
  lat: number;
  lng: number;
}) {
  return [
    {
      $lookup: {
        from: 'locations',
        localField: 'locationId',
        foreignField: '_id',
        as: 'location',
      },
    },
    {
      $unwind: {
        path: '$location',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        distance: {
          $function: {
            body: haversineFunction,
            args: [
              locationFilter.lat,
              locationFilter.lng,
              '$location.lat',
              '$location.lng',
            ],
            lang: 'js',
          },
        },
      },
    },
    {
      $match: {
        distance: { $lte: RADIUS_IN_METERS },
      },
    },
  ];
}

function buildBasePipeline(
  entityFilterQuery: FilterQuery<Model<RewardDocument>>,
  locationFilter?: { lat?: number; lng?: number },
  countryCode?: string,
) {
  const { userId, ...rest } = entityFilterQuery;
  const pipeline: any[] = [
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
    pipeline.push({
      $match: {
        'place.employees.user':
          typeof userId === 'string' ? new Types.ObjectId(userId) : userId,
      },
    });
  }

  // Jeśli podano filtr po countryCode (fallback)
  if (countryCode) {
    pipeline.push({
      $lookup: {
        from: 'locations',
        localField: 'locationId',
        foreignField: '_id',
        as: 'location',
      },
    });
    pipeline.push({
      $unwind: {
        path: '$location',
        preserveNullAndEmptyArrays: true,
      },
    });
    pipeline.push({
      $match: {
        'location.countryCode': countryCode,
      },
    });
  }
  // Jeśli podano filtr po lokalizacji (promień 15 km)
  else if (locationFilter?.lat !== undefined && locationFilter?.lng !== undefined) {
    pipeline.push(
      ...buildLocationFilterStages({
        lat: locationFilter.lat,
        lng: locationFilter.lng,
      }),
    );
  }

  return pipeline;
}

export function getPaginatedRewardData(
  start: number,
  limit: number,
  entityFilterQuery: FilterQuery<Model<RewardDocument>>,
  locationFilter?: { lat?: number; lng?: number },
  countryCode?: string,
) {
  const dataPipeline = buildBasePipeline(entityFilterQuery, locationFilter, countryCode);

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

  const metadataPipeline = buildBasePipeline(entityFilterQuery, locationFilter, countryCode);

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
