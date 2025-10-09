import { Test, TestingModule } from '@nestjs/testing';
import { UserEventController } from './event.controller.user';
import { EventService } from './event.service';

describe('EventController', () => {
  let controller: UserEventController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserEventController],
      providers: [EventService],
    }).compile();

    controller = module.get<UserEventController>(UserEventController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
