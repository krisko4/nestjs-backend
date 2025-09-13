import { IsMongoId, IsOptional, IsBooleanString } from 'class-validator';
import { PaginationQuery } from './pagination.query';

export class EventFilterQuery extends PaginationQuery {
  @IsMongoId()
  @IsOptional()
  locationId?: string;
  @IsMongoId()
  @IsOptional()
  participatorId?: string;
  @IsMongoId()
  @IsOptional()
  userId?: string;
  @IsBooleanString()
  @IsOptional()
  active?: boolean;
}
