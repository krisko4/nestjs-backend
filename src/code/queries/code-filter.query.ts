import { IsMongoId, IsOptional, IsString } from 'class-validator';

export class CodeFilterQuery {
  @IsMongoId()
  @IsOptional()
  rewardId?: string;
  @IsString()
  value?: string;
  @IsMongoId()
  @IsOptional()
  locationId?: string;
}
