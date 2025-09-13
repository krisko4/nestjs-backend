import { IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';
import { RewardAvailableFor } from '../schemas/reward.schema';

export class CreateRewardDto {
  @IsString()
  name: string;
  @IsString()
  description: string;
  @IsMongoId()
  @IsOptional()
  eventId?: string;
  @IsEnum(RewardAvailableFor)
  availableFor: RewardAvailableFor;
  @IsMongoId()
  locationId: string;
  // @IsISO8601()
  // @IsOptional()
  // scheduledFor?: Date;
  // @IsNumber()
  // @Max(100)
  // @Min(1)
  // rewardPercentage: number;
}
