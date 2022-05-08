import { IsMongoId, IsOptional } from 'class-validator';

export class FindOpinionsQuery {
  @IsOptional()
  @IsMongoId()
  locationId: string;
  @IsOptional()
  @IsMongoId()
  uid: string;
}
