import { IsEnum, IsMongoId, IsNumber, IsOptional } from 'class-validator';
import { PaginationQuery } from './pagination.query';
import { Type } from 'class-transformer';
import { RewardStatus } from '../schemas/reward.schema';

export class RewardFilterQuery extends PaginationQuery {
  @IsMongoId()
  @IsOptional()
  eventId?: string;
  @IsMongoId()
  @IsOptional()
  placeId?: string;
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lat?: number;
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lng?: number;
  @IsOptional()
  @IsEnum(RewardStatus)
  status?: RewardStatus;
}
