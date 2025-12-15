import { StatisticsFilterQuery } from './queries/statistics-filter.query';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Query,
  UseGuards,
  Param,
} from '@nestjs/common';
import { RewardService } from './reward.service';
import { RewardFilterQuery } from './queries/reward-filter.query';
import { PaginationQuery } from './queries/pagination.query';
import { plainToInstance } from 'class-transformer';
import { Reward } from './schemas/reward.schema';
import { SearchRewardQuery } from './queries/search-reward.query';

@Controller('user/rewards')
export class UserRewardController {
  constructor(private readonly rewardService: RewardService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  find(@Query() rewardFilterQuery: RewardFilterQuery, @Req() req) {
    const { uid } = req.user;
    return this.rewardService.find(rewardFilterQuery, uid);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/search')
  search(@Query() searchQuery: SearchRewardQuery) {
    console.log('searchin');
    return this.rewardService.search(searchQuery);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/activate')
  activateReward(@Param('id') id: string, @Req() req) {
    const { uid } = req.user;
    return this.rewardService.activateReward(
      {
        rewardId: id,
      },
      uid,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findById(@Param('id') id: string, @Req() req) {
    const { uid } = req.user;
    const reward = await this.rewardService.findByIdForUser(id, uid);
    return plainToInstance(Reward, reward);
  }
}
