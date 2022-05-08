import { IsMongoId, IsOptional } from 'class-validator';

export class FindVisitsQuery {
  @IsOptional()
  @IsMongoId()
  locationId: string;
  @IsOptional()
  @IsMongoId()
  uid: string;
}
