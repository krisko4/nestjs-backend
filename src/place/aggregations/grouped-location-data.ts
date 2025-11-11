export function getGroupedLocationData() {
  return {
    _id: '$_id',
    name: { $first: '$name' },
    type: { $first: '$type' },
    logo: { $first: '$logo' },
    images: { $first: '$images' },
    description: { $first: '$description' },
    createdAt: { $first: '$createdAt' },
    userId: { $first: '$userId' },
    locations: {
      $addToSet: '$locations',
    },
  };
}
