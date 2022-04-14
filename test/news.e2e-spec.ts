import { INestApplication } from '@nestjs/common';
import { NewsModule } from '../src/news/news.module';
import { NewsService } from '../src/news/news.service';
import * as request from 'supertest';
import { Test } from '@nestjs/testing';

describe('News', () => {
  let app: INestApplication;
  const newsService = { findAll: () => ['test'] };
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [NewsModule],
    })
      .overrideProvider(NewsService)
      .useValue(newsService)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });
  it(`/GET news`, () => {
    return request(app.getHttpServer()).get('/news').expect(200).expect({
      data: newsService.findAll(),
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
