import { IsMongoId, IsOptional } from 'class-validator';

export class NotificationFilterQuery {
  @IsMongoId()
  @IsOptional()
  locationId?: string;
  @IsMongoId()
  @IsOptional()
  receiverId?: string;
  @IsMongoId()
  @IsOptional()
  eventId?: string;
}
