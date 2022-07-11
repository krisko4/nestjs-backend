import { IsString, MaxLength, IsMongoId, IsArray } from 'class-validator';

export class CreateNotificationDto {
  @IsString()
  @MaxLength(100)
  title: string;
  @IsString()
  @MaxLength(100)
  body: string;
  @IsMongoId()
  locationId: string;
  @IsArray()
  @IsMongoId({ each: true })
  receivers: string[];
  @IsMongoId()
  eventId: string;
}
