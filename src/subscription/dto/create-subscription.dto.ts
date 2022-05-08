import { IsMongoId } from 'class-validator';

export class CreateSubscriptionDto {
  @IsMongoId()
  userId: string;
  @IsMongoId()
  locationId: string;
}
