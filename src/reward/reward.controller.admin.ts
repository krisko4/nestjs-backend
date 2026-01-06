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
  Delete,
  Patch,
} from '@nestjs/common';
import { RewardService } from './reward.service';
import { CreateRewardDto } from './dto/create-reward.dto';
import { UpdateRewardDto } from './dto/update-reward.dto';
import { RewardFilterQuery } from './queries/reward-filter.query';
import { PaginationQuery } from './queries/pagination.query';
import { plainToInstance } from 'class-transformer';
import { Reward, RewardStatus } from './schemas/reward.schema';
import { CodeService } from 'src/code/code.service';

@Controller('admin/rewards')
export class AdminRewardController {
  constructor(
    private readonly rewardService: RewardService,
    private readonly codeService: CodeService,
  ) {}

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
    const [reward, totalScans] = await Promise.all([
      this.rewardService.findById(id),
      this.codeService.countRewardUsage(id),
    ]);
    console.log(reward);
    return {
      ...plainToInstance(Reward, reward.toObject()),
      totalScans,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  updateById(
    @Param('id') id: string,
    @Body() updateRewardDto: UpdateRewardDto,
    @Req() req: any,
  ) {
    const { uid } = req.user;
    return this.rewardService.updateById(id, uid, updateRewardDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  deleteById(@Param('id') id: string, @Req() req) {
    const { uid } = req.user;
    return this.rewardService.deleteById(id, uid);
  }

  @UseGuards(JwtAuthGuard)
  @Get('statistics')
  findStatistics(@Query() statisticsFilterQuery: StatisticsFilterQuery) {
    return this.rewardService.findStatistics(statisticsFilterQuery);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/scan-history')
  async getRewardScanHistory(
    @Param('id') rewardId: string,
    @Query() pagination: PaginationQuery,
    @Req() req,
  ) {
    const userId = req.user.uid;
    const { start = 0, limit = 10 } = pagination;
    return this.rewardService.getRewardScanHistory(
      rewardId,
      userId,
      start,
      limit,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  async toggleRewardStatus(
    @Param('id') id: string,
    @Body('status') status: RewardStatus,
    @Req() req,
  ) {
    const { uid } = req.user;
    return this.rewardService.toggleRewardStatus(id, uid, status);
  }
}
