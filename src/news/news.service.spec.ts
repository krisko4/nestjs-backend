import { Test, TestingModule } from '@nestjs/testing';
import { CreateNewsDto } from './dto/create-news.dto';
import { NewsRepository } from './news.repository';
import { NewsService } from './news.service';
import { News } from './schemas/news.schema';
import { newsStub } from './test/stubs/news.stub';
jest.mock('./news.repository');

describe('NewsService', () => {
  let service: NewsService;
  let repository: NewsRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NewsService, NewsRepository],
    }).compile();
    service = module.get<NewsService>(NewsService);
    repository = module.get<NewsRepository>(NewsRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    describe('when findAll is called', () => {
      let result: News[];
      beforeEach(async () => {
        result = await service.findAll();
      });
      it('should call repository method', () => {
        expect(repository.find).toHaveBeenCalled();
      });
      it('should return news array', () => {
        expect(result).toEqual([newsStub()]);
      });
    });
  });
  describe('findByLocationId', () => {
    describe('when findByLocationId is called', () => {
      let result: News[];
      let stub: ReturnType<typeof newsStub>;
      beforeEach(async () => {
        stub = newsStub();
        result = await service.findByLocationId(stub.locationId);
      });
      it('should call service method', () => {
        expect(repository.findAndSort).toHaveBeenCalledWith(
          { locationId: stub.locationId },
          { date: -1 },
        );
      });
      it('should return a news', async () => {
        expect(result).toEqual(stub);
      });
    });
  });
  describe('createNews', () => {
    describe('when createNews is called', () => {
      let result: News;
      let stub: News;
      let createNewsDto: CreateNewsDto;
      beforeEach(async () => {
        stub = newsStub();
        createNewsDto = {
          title: stub.title,
          content: stub.content,
          locationId: stub.locationId,
        };
        result = await service.createNews(createNewsDto);
      });
      it('should call repository method', () => {
        expect(repository.create).toHaveBeenCalled();
      });
      it('should return news array', () => {
        expect(result).toEqual(newsStub());
      });
    });
  });
});
