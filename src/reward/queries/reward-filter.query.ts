import { IsMongoId, IsOptional } from 'class-validator';
import { PaginationQuery } from './pagination.query';

export class RewardFilterQuery extends PaginationQuery {
  @IsMongoId()
  @IsOptional()
  eventId?: string;
  @IsMongoId()
  @IsOptional()
  userId?: string;
}
