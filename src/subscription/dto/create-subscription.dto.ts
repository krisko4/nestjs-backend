import { IsMongoId, IsString } from 'class-validator';

export class CreateSubscriptionDto {
  @IsMongoId()
  userId: string;
  @IsMongoId()
  locationId: string;
  @IsString()
  referralCode?: string;
}
