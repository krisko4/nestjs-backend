import { IsMongoId, IsOptional } from 'class-validator';
import { PaginationQuery } from 'src/place/queries/pagination.query';

export class NotificationFilterQuery {
  @IsMongoId()
  @IsOptional()
  locationId?: string;
  @IsMongoId()
  @IsOptional()
  receiverId?: string;
}
