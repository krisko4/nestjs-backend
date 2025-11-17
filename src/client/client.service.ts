import { Injectable, NotFoundException } from '@nestjs/common';
import { CodeService } from 'src/code/code.service';
import { PlaceService } from 'src/place/place.service';
import { UserService } from 'src/user/user.service';
import { ClientResponseDto } from './dto/client-response.dto';
import {
  ScanHistoryItemDto,
  ScanHistoryResponseDto,
} from './dto/scan-history-response.dto';
import {
  PaginatedResponse,
  SimplePaginatedResponse,
  ScanHistoryPaginatedResponse,
} from './dto/pagination.query';

@Injectable()
export class ClientService {
  constructor(
    private readonly codeService: CodeService,
    private readonly placeService: PlaceService,
    private readonly userService: UserService,
  ) {}

  async getClientsByUserId(
    userId: string,
    page: number = 1,
    limit: number = 10,
    placeId?: string,
    locationIds?: string[],
    email?: string,
    minScans?: number,
    maxScans?: number,
    lastScanDateFrom?: string,
    lastScanDateTo?: string,
    sortBy: string = 'lastScanDate',
    sortOrder: string = 'desc',
  ): Promise<PaginatedResponse<ClientResponseDto>> {
    // Pobierz wszystkie place'y użytkownika
    const places = await this.placeService.findByUserId(userId);

    if (!places || places.length === 0) {
      return {
        data: [],
        metadata: {
          start: page,
          limit,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      };
    }

    // Wyciągnij ID place'ów
    const placeIds = places.map((place) => place._id.toString());

    // Stwórz mapę placeId -> placeName dla szybkiego dostępu
    const placeMap = new Map(
      places.map((place) => [place._id.toString(), place.name]),
    );

    // Pobierz klientów z agregacji MongoDB (z paginacją i filtrami)
    const { data: clientsData, total } =
      await this.codeService.findClientsByPlaceIds(
        placeIds,
        page,
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

    // Mapuj dane z agregacji na DTO
    const mappedData = clientsData.map((clientData) => ({
      userId: clientData._id.toString(),
      firstName: clientData.userData?.firstName,
      lastName: clientData.userData?.lastName,
      email: clientData.userData?.email,
      img: clientData.userData?.img,
      totalScans: clientData.totalScans,
      firstScanDate: clientData.firstScanDate,
      lastScanDate: clientData.lastScanDate,
      places: clientData.places.map((p: any) => ({
        placeId: p.placeId.toString(),
        placeName: placeMap.get(p.placeId.toString()) || 'Unknown Place',
        scanCount: p.scanCount,
      })),
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      data: mappedData,
      metadata: {
        start: page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getScanHistoryByClientId(
    userId: string,
    clientId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<ScanHistoryPaginatedResponse<ScanHistoryItemDto>> {
    const places = await this.placeService.findByUserId(userId);

    if (!places || places.length === 0) {
      throw new NotFoundException('No places found for this user');
    }

    const placeIds = places.map((place) => place._id.toString());

    const client = await this.userService.findById(clientId);

    const { data: scannedCodes, total } =
      await this.codeService.findScanHistoryByClientAndPlaceIds(
        clientId,
        placeIds,
        page,
        limit,
      );

    const clientInfo = {
      _id: clientId,
      email: client?.email,
    };

    const scans: ScanHistoryItemDto[] = scannedCodes.map((code) => ({
      codeId: code._id.toString(),
      scannedAt: code.usedAt,
      ...(code.usedBy && {
        scannedBy: {
          _id: code.usedBy._id.toString(),
          firstName: code.usedBy.firstName,
          lastName: code.usedBy.lastName,
          email: code.usedBy.email,
          img: code.usedBy.img,
        },
      }),
      ...(code.placeEmployee && {
        placeEmployee: {
          _id: code.placeEmployee._id.toString(),
          name: code.placeEmployee.name,
        },
      }),
      placeName: code.place?.name,
      placeId: code.place?._id?.toString() || '',
      ...(code.location &&
        code.location._id && {
          location: {
            _id: code.location._id.toString(),
            address: code.location.address,
          },
        }),
      ...(code.reward && {
        reward: {
          _id: code.reward._id.toString(),
          name: code.reward.name,
        },
      }),
    }));

    return {
      client: clientInfo,
      data: scans,
      metadata: {
        start: page,
        limit,
        total,
      },
    };
  }
}
