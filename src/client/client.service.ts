import { Injectable, NotFoundException } from '@nestjs/common';
import { CodeRepository } from 'src/code/code.repository';
import { PlaceService } from 'src/place/place.service';
import { ClientResponseDto } from './dto/client-response.dto';
import {
  ScanHistoryItemDto,
  ScanHistoryResponseDto,
} from './dto/scan-history-response.dto';
import { PaginatedResponse } from './dto/pagination.query';

@Injectable()
export class ClientService {
  constructor(
    private readonly codeRepository: CodeRepository,
    private readonly placeService: PlaceService,
  ) {}

  /**
   * Pobiera listę wszystkich klientów dla place'ów należących do użytkownika
   * @param userId - ID użytkownika (owner/employee place'ów)
   * @param page - Numer strony
   * @param limit - Liczba elementów na stronę
   * @param placeId - Opcjonalny filtr po konkretnym placeId
   * @param locationId - Opcjonalny filtr po konkretnej lokalizacji
   * @param email - Opcjonalny filtr po emailu klienta
   * @param minScans - Minimalna liczba skanów
   * @param maxScans - Maksymalna liczba skanów
   * @param lastScanDateFrom - Data początkowa ostatniej wizyty
   * @param lastScanDateTo - Data końcowa ostatniej wizyty
   * @param sortBy - Pole według którego sortować
   * @param sortOrder - Kierunek sortowania
   */
  async getClientsByUserId(
    userId: string,
    page: number = 1,
    limit: number = 10,
    placeId?: string,
    locationId?: string,
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
      await this.codeRepository.findClientsByPlaceIds(
        placeIds,
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

  /**
   * Pobiera historię skanów dla konkretnego klienta
   * @param userId - ID użytkownika (owner/employee place'ów)
   * @param clientId - ID klienta
   * @param page - Numer strony
   * @param limit - Liczba elementów na stronę
   */
  async getScanHistoryByClientId(
    userId: string,
    clientId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResponse<ScanHistoryItemDto>> {
    // Pobierz wszystkie place'y użytkownika
    const places = await this.placeService.findByUserId(userId);

    if (!places || places.length === 0) {
      throw new NotFoundException('No places found for this user');
    }

    // Wyciągnij ID place'ów
    const placeIds = places.map((place) => place._id.toString());

    // Pobierz historię skanów (z paginacją)
    const { data: scannedCodes, total } =
      await this.codeRepository.findScanHistoryByClientAndPlaceIds(
        clientId,
        placeIds,
        page,
        limit,
      );

    // Mapuj na DTO
    const scans: ScanHistoryItemDto[] = scannedCodes.map((code) => ({
      codeId: code._id.toString(),
      codeValue: code.value,
      scannedAt: code.usedAt,
      scannedBy: code.usedBy?.toString() || 'Unknown',
      placeName: code.reward?.place?.name || 'Unknown Place',
      placeId: code.reward?.place?._id?.toString() || '',
      rewardDescription: code.reward?.description,
    }));

    const totalPages = Math.ceil(total / limit);

    return {
      data: scans,
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
}
