import { Test, TestingModule } from '@nestjs/testing';
import { User } from './schemas/user.schema';
import { UserSerializer } from './serializers/user.serializer';
import { userSerializerStub } from './test/stubs/user.serializer.stub';
import { userStub } from './test/stubs/user.stub';
import { UserController } from './user.controller';
import { UserService } from './user.service';
jest.mock('./user.service')

describe('UserController', () => {
  let controller: UserController;
  let service: UserService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [UserService],
    }).compile();

    controller = module.get<UserController>(UserController);
    service = module.get<UserService>(UserService);
    jest.clearAllMocks()
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
  describe('findAll', () => {
    describe('when findAll is called', () => {
      let results: UserSerializer[]
      let stub: UserSerializer
      beforeEach(async () => {
        stub = userSerializerStub();
        results = await controller.findAll();
      })
      it('should call service method', () => {
        expect(service.findAll).toHaveBeenCalled();
      })
      it('should return users', () => {
        expect(results).toEqual([stub])
      })
    })
  })
});
