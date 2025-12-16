import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  start?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

export interface PaginatedResponse<T> {
  data: T[];
  metadata: {
    start: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface SimplePaginatedResponse<T> {
  data: T[];
  metadata: {
    start: number;
    limit: number;
    total: number;
  };
}

export interface ScanHistoryPaginatedResponse<T> {
  client: {
    _id: string;
    email?: string;
  };
  data: T[];
  metadata: {
    start: number;
    limit: number;
    total: number;
  };
}
