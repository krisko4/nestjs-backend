import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Min,
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

  /**
   * Limit użyć rewarda przez jednego użytkownika.
   * null = bez limitu, liczba = konkretny limit (min 1)
   */
  @IsOptional()
  @IsNumber()
  @Min(1)
  usageLimit?: number | null;

  // @IsISO8601()
  // @IsOptional()
  // scheduledFor?: Date;
  // @IsNumber()
  // @Max(100)
  // @Min(1)
  // rewardPercentage: number;
}
