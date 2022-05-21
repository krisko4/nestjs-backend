import {
  IsString,
  MaxLength,
  IsMongoId,
  IsArray,
  ValidateNested,
} from 'class-validator';

class Receiver {}

export class CreateNotificationDto {
  @IsString()
  @MaxLength(100)
  title: string;
  @IsString()
  content: string;
  @IsMongoId()
  locationId: string;
  @IsArray()
  @IsMongoId({ each: true })
  receivers: string[];
}
