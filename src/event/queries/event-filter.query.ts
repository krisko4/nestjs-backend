import { IsMongoId, IsOptional, IsBooleanString, IsEnum } from 'class-validator';
import { PaginationQuery } from './pagination.query';
import { EventStatus } from '../schemas/event.schema';

export class EventFilterQuery extends PaginationQuery {
  @IsMongoId()
  @IsOptional()
  locationId?: string;
  @IsMongoId()
  @IsOptional()
  participatorId?: string;
  @IsBooleanString()
  @IsOptional()
  active?: boolean;
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;
  @IsMongoId()
  @IsOptional()
  placeId?: string;
}
