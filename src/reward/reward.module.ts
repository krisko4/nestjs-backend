import { Module } from '@nestjs/common';
import { RewardService } from './reward.service';
import { RewardController } from './reward.controller';
import { RewardRepository } from './reward.repository';
import { MongooseModule } from '@nestjs/mongoose';
import { Reward, RewardSchema } from './schemas/reward.schema';
import { SubscriptionModule } from 'src/subscription/subscription.module';
import { CodeModule } from 'src/code/code.module';
import { EventModule } from 'src/event/event.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Reward.name, schema: RewardSchema }]),
    EventModule,
    SubscriptionModule,
    CodeModule,
  ],
  controllers: [RewardController],
  providers: [RewardService, RewardRepository],
})
export class RewardModule {}
