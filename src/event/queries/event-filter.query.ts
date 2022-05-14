import { IsMongoId, IsOptional } from 'class-validator';

export class EventFilterQuery {
  @IsMongoId()
  @IsOptional()
  locationId?: string;
}
