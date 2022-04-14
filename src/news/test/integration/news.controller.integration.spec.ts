import { Test } from '@nestjs/testing';
import { AppModule } from '../../../app.module';
import { DatabaseService } from '../../../database/database.service';
import { Types, Connection } from 'mongoose';
import { newsStub } from '../stubs/news.stub';
import * as request from 'supertest';

describe('NewsController', () => {
  let dbConnection: Connection;
  let httpServer: any;
  let app: any;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    dbConnection = moduleRef
      .get<DatabaseService>(DatabaseService)
      .getDbHandle();
    httpServer = app.getHttpServer();
  });

  afterEach(async () => {
    await dbConnection.collection('news').deleteMany({});
  });

  afterAll(async () => {
    await app.close();
  });

  describe('findAll', () => {
    it('should return an array of news', async () => {
      const stub = newsStub();
      await dbConnection.collection('news').insertOne(stub);
      const response = await request(httpServer).get('/news');
      expect(response.status).toBe(200);
      const returnedData = response.body[0];
      returnedData.date = new Date(returnedData.date);
      expect(returnedData).toMatchObject(stub);
    });
  });
  describe('findByLocationId', () => {
    it('should return news matched by locationId', async () => {
      const stub = newsStub();
      const matchingNews = {
        ...stub,
        locationId: new Types.ObjectId(stub.locationId),
      };
      const nonMatchingNews = {
        ...stub,
        locationId: new Types.ObjectId('6107e494bd1ede42c08fb601'),
      };
      await dbConnection
        .collection('news')
        .insertMany([matchingNews, nonMatchingNews]);
      const response = await request(httpServer).get('/news/search').query({
        locationId: stub.locationId,
      });
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      const returnedData = response.body[0];
      returnedData.date = new Date(returnedData.date);
      expect(returnedData).toMatchObject(stub);
    });
  });
  describe('createNews', () => {
    it('should create news', async () => {
      const stub = newsStub();
      const createNewsDto = {
        locationId: stub.locationId,
        content: stub.content,
        title: stub.title,
      };
      const response = await request(httpServer)
        .post('/news')
        .send(createNewsDto);
      expect(response.status).toBe(201);
      const returnedNews = {
        ...createNewsDto,
        locationId: new Types.ObjectId(createNewsDto.locationId),
      };
      expect(response.body).toMatchObject(returnedNews);
      const user = await dbConnection
        .collection('news')
        .findOne({ title: createNewsDto.title });
      expect(user).toMatchObject(returnedNews);
    });
  });
});
