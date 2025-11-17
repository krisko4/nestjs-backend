import {
  IsOptional,
  IsMongoId,
  IsEmail,
  IsInt,
  Min,
  IsDateString,
  IsString,
  IsEnum,
  IsArray,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
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
  @IsOptional()
  @IsMongoId()
  placeId?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map((id) => id.trim());
    }
    return value;
  })
  @IsArray()
  @IsMongoId({ each: true })
  locationIds?: string[];

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minScans?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxScans?: number;

  @IsOptional()
  @IsDateString()
  lastScanDateFrom?: string;

  @IsOptional()
  @IsDateString()
  lastScanDateTo?: string;

  @IsOptional()
  @IsEnum(SortBy)
  sortBy?: SortBy;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder;
}
