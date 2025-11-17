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

  @IsArray()
  @IsMongoId({ each: true })
  locationIds: string[];

  @ValidateIf((o) => o.availableFor === RewardAvailableFor.SELECTED_USERS)
  @IsArray()
  @IsMongoId({ each: true })
  selectedUserIds?: string[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  usageLimit?: number | null;
}
