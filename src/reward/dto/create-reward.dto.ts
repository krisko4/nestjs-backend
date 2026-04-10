import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
  Matches,
  IsDateString,
} from 'class-validator';
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

  @IsArray()
  @IsMongoId({ each: true })
  locationIds: string[];

  @ValidateIf((o) => o.availableFor === RewardAvailableFor.SELECTED_USERS)
  @IsArray()
  @IsMongoId({ each: true })
  selectedUserIds?: string[];

  @ValidateIf(
    (o) =>
      o.availableFor === RewardAvailableFor.TOP_ACTIVE_USERS ||
      o.availableFor === RewardAvailableFor.LEAST_ACTIVE_USERS,
  )
  @IsNumber()
  @Min(1)
  userLimit?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  usageLimit?: number | null;

  @ValidateIf((o) => o.availableFor === RewardAvailableFor.INACTIVE)
  @IsDateString()
  lastScanDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  points?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  pointsCost?: number;
}
