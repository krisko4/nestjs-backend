import {
  IsEnum,
  IsISO8601,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export enum AvailableFor {
  ALL = 'ALL',
  SUBSCRIBERS = 'SUBSCRIBERS',
}

export class CreateRewardDto {
  @IsString()
  name: string;
  @IsString()
  description: string;
  @IsMongoId()
  @IsOptional()
  eventId?: string;
  @IsEnum(AvailableFor)
  availableFor: AvailableFor;
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
