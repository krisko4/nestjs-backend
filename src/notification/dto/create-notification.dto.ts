import { NotificationType } from './../schemas/notification.schema';
import { IsMongoId, IsArray, IsEnum } from 'class-validator';

export class CreateNotificationDto {
  @IsMongoId()
  locationId?: string;
  @IsArray()
  @IsMongoId({ each: true })
  receivers: string[];
  @IsMongoId()
  eventId?: string;
  eventIds?: string[];
  @IsMongoId()
  rewardId?: string;
  @IsEnum(NotificationType)
  type: NotificationType;
}
