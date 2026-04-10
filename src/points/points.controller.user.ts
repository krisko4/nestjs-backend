import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PointsService } from './points.service';
import { PointsHistoryQuery } from './queries/points-history.query';

@Controller('user/points')
export class UserPointsController {
  constructor(private readonly pointsService: PointsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getUserPoints(
    @Query('placeId') placeId: string,
    @Req() req,
  ) {
    const { uid } = req.user;
    const points = await this.pointsService.getUserPointsAtPlace(uid, placeId);
    return { points };
  }

  @UseGuards(JwtAuthGuard)
  @Get('history')
  async getPointsHistory(
    @Query() query: PointsHistoryQuery,
    @Req() req,
  ) {
    const { uid } = req.user;
    return this.pointsService.getPointsHistory(
      uid,
      query.placeId,
      query.start,
      query.limit,
    );
  }
}
