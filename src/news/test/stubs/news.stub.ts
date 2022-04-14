import { News } from '../../schemas/news.schema';

export const newsStub = (): News => {
  return {
    title: 'Sample news',
    date: new Date(1, 1, 1, 1),
    content: 'This is a sample news',
    locationId: '6257d9c12121df40b14e898e',
  };
};
