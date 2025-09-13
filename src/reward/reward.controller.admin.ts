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
import { CreateRewardDto } from './dto/create-reward.dto';
import { RewardFilterQuery } from './queries/reward-filter.query';
import { PaginationQuery } from './queries/pagination.query';
import { plainToInstance } from 'class-transformer';
import { Reward } from './schemas/reward.schema';

@Controller('admin/rewards')
export class AdminRewardController {
  constructor(private readonly rewardService: RewardService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req, @Body() createRewardDto: CreateRewardDto) {
    const { uid } = req.user;
    return this.rewardService.create(createRewardDto, uid);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  find(@Query() rewardFilterQuery: RewardFilterQuery, @Req() req) {
    const { uid } = req.user;
    return this.rewardService.find(rewardFilterQuery, uid);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findById(@Param('id') id: string) {
    const reward = await this.rewardService.findById(id);
    return plainToInstance(Reward, reward.toObject());
  }

  @UseGuards(JwtAuthGuard)
  @Get('statistics')
  findStatistics(@Query() statisticsFilterQuery: StatisticsFilterQuery) {
    return this.rewardService.findStatistics(statisticsFilterQuery);
  }
}
