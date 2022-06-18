import { Controller, Get, Post, Body, Req, Query } from '@nestjs/common';
import { RewardService } from './reward.service';
import { CreateRewardDto } from './dto/create-reward.dto';
import { RewardFilterQuery } from './queries/reward-filter.query';

@Controller('rewards')
export class RewardController {
  constructor(private readonly rewardService: RewardService) {}

  @Post()
  create(@Req() req, @Body() createRewardDto: CreateRewardDto) {
    const { uid } = req.cookies;
    return this.rewardService.create(createRewardDto, uid);
  }

  @Get()
  find(@Query() rewardFilterQuery: RewardFilterQuery) {
    return this.rewardService.find(rewardFilterQuery);
  }
}
