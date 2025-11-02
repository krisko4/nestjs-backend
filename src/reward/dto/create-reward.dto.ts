import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  ValidateIf,
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

  @IsMongoId()
  locationId: string;

  /**
   * Lista ID użytkowników którzy mają dostęp do tego rewarda.
   * Wymagane tylko gdy availableFor = SELECTED_USERS
   */
  @ValidateIf((o) => o.availableFor === RewardAvailableFor.SELECTED_USERS)
  @IsArray()
  @IsMongoId({ each: true })
  selectedUserIds?: string[];

  // @IsISO8601()
  // @IsOptional()
  // scheduledFor?: Date;
  // @IsNumber()
  // @Max(100)
  // @Min(1)
  // rewardPercentage: number;
}
