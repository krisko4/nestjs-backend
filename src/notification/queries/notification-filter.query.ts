import {
  IsArray,
  IsMongoId,
  IsOptional,
  ValidateNested,
} from 'class-validator';

export class NotificationFilterQuery {
  @IsMongoId()
  @IsOptional()
  locationId?: string;
  @IsMongoId()
  @IsOptional()
  receiverId?: string;
  @IsMongoId()
  @IsOptional()
  eventId?: string;
  @IsMongoId()
  @IsOptional()
  rewardId?: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @IsMongoId()
  eventsIds?: string[];
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @IsMongoId()
  rewardsIds?: string[];
}
