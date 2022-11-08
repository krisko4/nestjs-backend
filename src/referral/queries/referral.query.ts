import { IsMongoId, IsOptional, IsString } from 'class-validator';

export class ReferralQuery {
  @IsMongoId()
  locationId?: string;
  @IsString()
  @IsOptional()
  codeValue?: string;
}
