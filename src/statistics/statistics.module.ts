import { Module } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { AdminStatisticsController } from './statistics.controller.admin';
import { PlaceModule } from 'src/place/place.module';
import { CodeModule } from 'src/code/code.module';
import { RewardModule } from 'src/reward/reward.module';
import { EventModule } from 'src/event/event.module';

@Module({
  imports: [PlaceModule, CodeModule, RewardModule, EventModule],
  controllers: [AdminStatisticsController],
  providers: [StatisticsService],
})
export class StatisticsModule {}
