import { IsMongoId, IsOptional } from 'class-validator';
import { PaginationQuery } from 'src/place/queries/pagination.query';

export class EventFilterQuery {
  @IsMongoId()
  @IsOptional()
  locationId?: string;
}
