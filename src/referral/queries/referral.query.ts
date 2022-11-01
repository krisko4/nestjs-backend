import { IsMongoId } from 'class-validator';

export class ReferralQuery {
  @IsMongoId()
  locationId?: string;
}
