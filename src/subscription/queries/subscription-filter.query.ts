import { IsMongoId, IsOptional } from 'class-validator';

export class SubscriptionFilterQuery {
  @IsMongoId()
  @IsOptional()
  userId?: string;
  @IsMongoId()
  @IsOptional()
  locationId?: string;
}
