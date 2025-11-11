import { Types } from 'mongoose';

function buildBasePipeline(countryCode?: string, locationIds?: string[]) {
  const pipeline: any[] = [
    {
      $unwind: '$locations',
    },
    {
      $match: {
        'locations.isActive': true,
      },
    },
  ];

  if (locationIds && locationIds.length > 0) {
    const objectIds = locationIds.map((id) => new Types.ObjectId(id));
    pipeline.push({
      $match: {
        'locations._id': { $in: objectIds },
      },
    });
  } else if (countryCode) {
    pipeline.push({
      $match: {
        'locations.countryCode': countryCode,
      },
    });
  }

  return pipeline;
}

export function getPaginatedPlaceDataForSearch(
  start: number,
  limit: number,
  countryCode?: string,
  locationIds?: string[],
  favoriteLocationIds: string[] = [],
) {
  const dataPipeline = buildBasePipeline(countryCode, locationIds);

  const favoriteObjectIds = favoriteLocationIds.map(
    (id) => new Types.ObjectId(id),
  );

  dataPipeline.push(
    { $skip: start },
    { $limit: limit },
    {
      $project: {
        _id: 1,
        name: 1,
        description: 1,
        logo: {
          $concat: [`${process.env.CLOUDI_URL}/`, '$logo'],
        },
        status: '$locations.status',
        locationId: '$locations._id',
        lat: '$locations.lat',
        lng: '$locations.lng',
        address: '$locations.address',
        countryCode: '$locations.countryCode',
        isFavorite: {
          $in: ['$locations._id', favoriteObjectIds],
        },
      },
    },
  );

  const metadataPipeline = buildBasePipeline(countryCode, locationIds);

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
