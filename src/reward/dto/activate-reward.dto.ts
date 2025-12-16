import { IsMongoId } from 'class-validator';

export class ActivateRewardDto {
  @IsMongoId()
  rewardId: string;

  @IsMongoId()
  locationId: string;
}
