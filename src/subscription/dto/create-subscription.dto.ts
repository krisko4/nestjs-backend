import { IsMongoId, IsOptional, IsString } from 'class-validator';

export class CreateSubscriptionDto {
  @IsMongoId()
  userId: string;
  @IsMongoId()
  locationId: string;
  @IsString()
  @IsOptional()
  referralCode?: string;
}
