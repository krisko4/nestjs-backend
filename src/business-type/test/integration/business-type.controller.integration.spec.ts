import { Test } from '@nestjs/testing';
import { AppModule } from '../../../app.module';
import { DatabaseService } from '../../../database/database.service';
import { Connection } from 'mongoose';
import { businessTypeStub } from '../stubs/business-type.stub';
import * as request from 'supertest';

describe('BusinessTypeController', () => {
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
    await dbConnection.collection('businesstypes').deleteMany({});
  });

  afterAll(async () => {
    await app.close();
  });

  describe('findAll', () => {
    it('should return an array of business types', async () => {
      const stub = businessTypeStub();
      await dbConnection.collection('businesstypes').insertOne(stub);
      const response = await request(httpServer).get('/business-types');
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject([stub]);
    });
  });
});
