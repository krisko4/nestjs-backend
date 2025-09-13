import { IsMongoId, IsString, MaxLength } from 'class-validator';

export class CreateEventDto {
  @MaxLength(100)
  title: string;
  content: string;
  startDate: Date;
  endDate: Date;
  // @IsString()
  // address: string;
  @IsMongoId()
  locationId: string;
}
