import { IsMongoId, IsNumber, IsOptional } from 'class-validator';
import { PaginationQuery } from './pagination.query';
import { Type } from 'class-transformer';

export class RewardFilterQuery extends PaginationQuery {
  @IsMongoId()
  @IsOptional()
  eventId?: string;
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lat?: number;
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lng?: number;
}
