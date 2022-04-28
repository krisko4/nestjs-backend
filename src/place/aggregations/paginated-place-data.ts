export function getPaginatedPlaceData(start: number, limit: number) {
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
      { $skip: start },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          name: 1,
          subtitle: 1,
          type: 1,
          logo: {
            $concat: [`${process.env.CLOUDI_URL}/`, '$logo'],
          },
          status: '$locations.status',
          locationId: '$locations._id',
          lat: '$locations.lat',
          lng: '$locations.lng',
          address: '$locations.address',
        },
      },
    ],
  };
}
