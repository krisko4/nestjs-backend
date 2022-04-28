import { Test, TestingModule } from '@nestjs/testing';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './schemas/user.schema';
import { userStub } from './test/stubs/user.stub';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';
jest.mock('./user.repository');

describe('UserService', () => {
  let service: UserService;
  let repository: UserRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService, UserRepository],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get<UserRepository>(UserRepository);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  describe('findAll', () => {
    describe('when findAll is called', () => {
      let results: User[];
      beforeEach(async () => {
        results = await service.findAll();
      });
      it('should call repository method', () => {
        expect(repository.find).toHaveBeenCalled();
      });
      it('should return users', () => {
        expect(results).toEqual([userStub()]);
      });
    });
  });
  describe('findByEmail', () => {
    describe('when findByEmail is called', () => {
      let result: User;
      let stub: User;
      beforeEach(async () => {
        stub = userStub();
        result = await service.findByEmail(stub.email);
      });
      it('should call repository method', () => {
        expect(repository.findByEmail).toHaveBeenCalled();
      });
      it('should return users', () => {
        expect(result).toEqual(stub);
      });
    });
  });
  describe('create', () => {
    describe('when create is called', () => {
      let result: User;
      let stub: User;
      let createUserDto: CreateUserDto;
      beforeEach(() => {
        stub = userStub();
        createUserDto = {
          firstName: stub.firstName,
          lastName: stub.lastName,
          email: stub.email,
          password: stub.password,
          birthdate: stub.birthdate,
        };
      });
      describe('if duplicate user was found', () => {
        it('should throw exception', async () => {
          await expect(service.create(createUserDto)).rejects.toThrow();
        });
      });
      describe('if duplicate user was not found', () => {
        beforeEach(async () => {
          jest.spyOn(repository, 'findByEmail').mockImplementation(() => null);
          result = await service.create(createUserDto);
        });
        it('should call repository method', () => {
          expect(repository.create).toHaveBeenCalled();
        });
        it('should return user', () => {
          expect(result).toEqual(stub);
        });
      });
    });
  });
});
