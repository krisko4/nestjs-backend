import { NotificationModule } from './../notification/notification.module';
import { Module } from '@nestjs/common';
import { RewardService } from './reward.service';
import { AdminRewardController } from './reward.controller.admin';
import { RewardRepository } from './reward.repository';
import { MongooseModule } from '@nestjs/mongoose';
import { Reward, RewardSchema } from './schemas/reward.schema';
import { CodeModule } from '../code/code.module';
import { EventModule } from '../event/event.module';
import { PlaceModule } from 'src/place/place.module';
import { UserRewardController } from './reward.controller.user';
import { UserModule } from 'src/user/user.module';
import { EmployeeModule } from 'src/employee/employee.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Reward.name, schema: RewardSchema }]),
    EventModule,
    PlaceModule,
    EmployeeModule,
    CodeModule,
    NotificationModule,
    UserModule,
  ],
  controllers: [AdminRewardController, UserRewardController],
  providers: [RewardService, RewardRepository],
})
export class RewardModule {}
