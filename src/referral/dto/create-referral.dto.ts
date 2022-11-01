import { IsMongoId, IsNumber, IsString } from 'class-validator';

export class CreateReferralDto {
  @IsMongoId()
  locationId: string;
  @IsNumber()
  requiredMembersCount: number;
  @IsString()
  description: string;
}
