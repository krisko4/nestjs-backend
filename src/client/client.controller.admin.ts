import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ClientService } from './client.service';
import { ClientFilterQuery } from './dto/client-filter.query';
import { PaginationQuery } from './dto/pagination.query';

@Controller('admin/clients')
export class AdminClientController {
  constructor(private readonly clientService: ClientService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getClients(@Query() query: ClientFilterQuery, @Req() req) {
    const userId = req.user.uid;
    const {
      start = 0,
      limit = 10,
      placeId,
      locationIds,
      email,
      minScans,
      maxScans,
      lastScanDateFrom,
      lastScanDateTo,
      sortBy = 'lastScanDate',
      sortOrder = 'desc',
    } = query;

    return this.clientService.getClientsByUserId(
      userId,
      start,
      limit,
      placeId,
      locationIds,
      email,
      minScans,
      maxScans,
      lastScanDateFrom,
      lastScanDateTo,
      sortBy,
      sortOrder,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(':clientId/scan-history')
  async getScanHistory(
    @Param('clientId') clientId: string,
    @Query() pagination: PaginationQuery,
    @Req() req,
  ) {
    const userId = req.user.uid;
    const { start = 0, limit = 10 } = pagination;
    return this.clientService.getScanHistoryByClientId(
      userId,
      clientId,
      start,
      limit,
    );
  }
}
