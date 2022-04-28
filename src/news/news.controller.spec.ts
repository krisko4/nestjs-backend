import { Test, TestingModule } from '@nestjs/testing';
import { CreateNewsDto } from './dto/create-news.dto';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';
import { News } from './schemas/news.schema';
import { newsStub } from './test/stubs/news.stub';
jest.mock('./news.service');

describe('NewsController', () => {
  let controller: NewsController;
  let service: NewsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NewsController],
      providers: [NewsService],
    }).compile();
    service = module.get<NewsService>(NewsService);
    controller = module.get<NewsController>(NewsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
  describe('findAll', () => {
    describe('when findAll is called', () => {
      let result: News[];
      let stub: ReturnType<typeof newsStub>;
      beforeEach(async () => {
        stub = newsStub();
        result = await controller.findAll();
      });
      it('should call service method', () => {
        expect(service.findAll).toHaveBeenCalled();
      });
      it('should return an array of news', async () => {
        expect(result).toEqual([stub]);
      });
    });
  });
  describe('findByLocationId', () => {
    describe('when findByLocationId is called', () => {
      let result: News[];
      let stub: ReturnType<typeof newsStub>;
      beforeEach(async () => {
        stub = newsStub();
        result = await controller.findByLocationId(stub.locationId);
      });
      it('should call service method', () => {
        expect(service.findByLocationId).toHaveBeenCalledWith(stub.locationId);
      });
      it('should return a news', async () => {
        expect(result).toEqual(stub);
      });
    });
  });
  describe('createNews', () => {
    describe('when createNews is called', () => {
      let result: News;
      let createNewsDto: CreateNewsDto;
      let stub: ReturnType<typeof newsStub>;
      beforeEach(async () => {
        stub = newsStub();
        createNewsDto = {
          title: stub.title,
          content: stub.content,
          locationId: stub.locationId,
        };
        result = await controller.createNews(createNewsDto);
      });
      it('should call service method', () => {
        expect(service.createNews).toHaveBeenCalledWith(createNewsDto);
      });
      it('should return a news', async () => {
        expect(result).toEqual(stub);
      });
    });
  });
});
