import { newsStub } from '../test/stubs/news.stub';

export const NewsRepository = jest.fn().mockReturnValue({
  find: jest.fn().mockResolvedValue([newsStub()]),
  create: jest.fn().mockResolvedValue(newsStub()),
  findAndSort: jest.fn().mockResolvedValue(newsStub()),
});
