import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { StatisticsService } from './statistics.service';
import { StatisticsResponseDto } from './dto/statistics-response.dto';

@Controller('admin/statistics')
export class AdminStatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getStatistics(@Request() req): Promise<StatisticsResponseDto> {
    return this.statisticsService.getStatistics(req.user.uid);
  }
}
