import { IsISO8601, IsMongoId, IsString, MaxLength } from 'class-validator';

export class CreateEventDto {
  @IsISO8601()
  startDate: Date;
  @IsISO8601()
  endDate: Date;
  @IsString()
  @MaxLength(100)
  title: string;
  content: string;
  @IsMongoId()
  locationId: string;
  @IsMongoId()
  placeId: string;
}
