import { newsStub } from '../test/stubs/news.stub';

export const NewsService = jest.fn().mockReturnValue({
  findAll: jest.fn().mockResolvedValue([newsStub()]),
  findByLocationId: jest.fn().mockResolvedValue(newsStub()),
  createNews: jest.fn().mockResolvedValue(newsStub()),
});
