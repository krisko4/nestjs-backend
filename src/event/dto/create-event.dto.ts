import { IsArray, IsMongoId, MaxLength } from 'class-validator';

export class CreateEventDto {
  @MaxLength(100)
  title: string;
  content: string;
  startDate: Date;
  endDate?: Date;
  @IsArray()
  @IsMongoId({ each: true })
  locationIds: string[];
}
