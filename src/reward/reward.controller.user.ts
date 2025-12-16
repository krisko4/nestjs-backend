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
import { ActivateRewardDto } from './dto/activate-reward.dto';

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
  search(@Query() searchQuery: SearchRewardQuery, @Req() req) {
    const { uid } = req.user;
    return this.rewardService.search(searchQuery, uid);
  }

  @UseGuards(JwtAuthGuard)
  @Post('activate')
  activateReward(@Body() activateRewardDto: ActivateRewardDto, @Req() req) {
    const { uid } = req.user;
    return this.rewardService.activateReward(activateRewardDto, uid);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findById(@Param('id') id: string, @Req() req) {
    const { uid } = req.user;
    const reward = await this.rewardService.findByIdForUser(id, uid);
    return plainToInstance(Reward, reward);
  }
}
