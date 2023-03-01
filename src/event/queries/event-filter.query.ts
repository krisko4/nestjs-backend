import { IsMongoId, IsOptional, IsBooleanString } from 'class-validator';

export class EventFilterQuery {
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
