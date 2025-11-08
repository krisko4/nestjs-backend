import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { ClientService } from './client.service';
import { ClientFilterQuery } from './dto/client-filter.query';
import { PaginationQuery } from './dto/pagination.query';

@Controller('admin/clients')
export class AdminClientController {
  constructor(private readonly clientService: ClientService) {}

  /**
   * GET /admin/clients?page=1&limit=10&placeId=xxx&locationId=xxx&email=xxx&minScans=5&maxScans=50&lastScanDateFrom=2024-01-01&lastScanDateTo=2024-12-31&sortBy=totalScans&sortOrder=desc
   * Pobiera listę wszystkich klientów (użytkowników którzy zeskanowali kody)
   * dla place'ów należących do zalogowanego użytkownika
   * Opcjonalnie można filtrować po:
   * - placeId - konkretny place
   * - locationId - konkretna lokalizacja
   * - email - email klienta (częściowe dopasowanie, case-insensitive)
   * - minScans, maxScans - zakres liczby skanów
   * - lastScanDateFrom, lastScanDateTo - zakres dat ostatniej wizyty (format ISO 8601)
   * - sortBy - pole sortowania (lastScanDate | totalScans, domyślnie: lastScanDate)
   * - sortOrder - kierunek sortowania (asc | desc, domyślnie: desc)
   */
  @UseGuards(JwtAuthGuard)
  @Get()
  async getClients(@Query() query: ClientFilterQuery, @Req() req) {
    const userId = req.user.uid;
    const {
      page = 1,
      limit = 10,
      placeId,
      locationId,
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
      page,
      limit,
      placeId,
      locationId,
      email,
      minScans,
      maxScans,
      lastScanDateFrom,
      lastScanDateTo,
      sortBy,
      sortOrder,
    );
  }

  /**
   * GET /admin/clients/:clientId/scan-history?page=1&limit=10
   * Pobiera historię skanowanych kodów dla konkretnego klienta
   * w place'ach należących do zalogowanego użytkownika
   */
  @UseGuards(JwtAuthGuard)
  @Get(':clientId/scan-history')
  async getScanHistory(
    @Param('clientId') clientId: string,
    @Query() pagination: PaginationQuery,
    @Req() req,
  ) {
    const userId = req.user.uid;
    const { page = 1, limit = 10 } = pagination;
    return this.clientService.getScanHistoryByClientId(
      userId,
      clientId,
      page,
      limit,
    );
  }
}
