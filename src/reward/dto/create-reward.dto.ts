import {
  IsISO8601,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateRewardDto {
  @IsISO8601()
  @IsOptional()
  scheduledFor?: Date;
  @IsMongoId()
  eventId: string;
  @IsNumber()
  @Max(100)
  @Min(1)
  rewardPercentage: number;
  @IsString()
  description: string;
}
