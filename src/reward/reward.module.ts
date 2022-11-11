import { NotificationModule } from './../notification/notification.module';
import { Module } from '@nestjs/common';
import { RewardService } from './reward.service';
import { RewardController } from './reward.controller';
import { RewardRepository } from './reward.repository';
import { MongooseModule } from '@nestjs/mongoose';
import { Reward, RewardSchema } from './schemas/reward.schema';
import { SubscriptionModule } from '../subscription/subscription.module';
import { CodeModule } from '../code/code.module';
import { EventModule } from '../event/event.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Reward.name, schema: RewardSchema }]),
    EventModule,
    SubscriptionModule,
    CodeModule,
    NotificationModule,
  ],
  controllers: [RewardController],
  providers: [RewardService, RewardRepository],
})
export class RewardModule {}
