import {
  IsOptional,
  IsMongoId,
  IsEmail,
  IsInt,
  Min,
  IsDateString,
  IsString,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQuery } from './pagination.query';

export enum SortBy {
  LAST_SCAN_DATE = 'lastScanDate',
  TOTAL_SCANS = 'totalScans',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class ClientFilterQuery extends PaginationQuery {
  /**
   * Opcjonalny filtr - jeśli podany, zwraca tylko klientów
   * którzy zeskanowali kody w tym konkretnym placeId
   */
  @IsOptional()
  @IsMongoId()
  placeId?: string;

  /**
   * Opcjonalny filtr - jeśli podany, zwraca tylko klientów
   * którzy zeskanowali kody w tym konkretnym locationId
   */
  @IsOptional()
  @IsMongoId()
  locationId?: string;

  /**
   * Filtrowanie po emailu klienta (partial match)
   */
  @IsOptional()
  @IsString()
  email?: string;

  /**
   * Minimalna liczba skanów
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minScans?: number;

  /**
   * Maksymalna liczba skanów
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxScans?: number;

  /**
   * Data początkowa ostatniej wizyty (format ISO 8601)
   */
  @IsOptional()
  @IsDateString()
  lastScanDateFrom?: string;

  /**
   * Data końcowa ostatniej wizyty (format ISO 8601)
   */
  @IsOptional()
  @IsDateString()
  lastScanDateTo?: string;

  /**
   * Pole według którego sortować (domyślnie: lastScanDate)
   */
  @IsOptional()
  @IsEnum(SortBy)
  sortBy?: SortBy;

  /**
   * Kierunek sortowania (domyślnie: desc)
   */
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder;
}
