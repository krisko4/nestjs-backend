import {
  IsDate,
  IsDateString,
  IsISO8601,
  IsMongoId,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateEventDto {
  startDate: Date;
  endDate: Date;
  @IsString()
  address: string;
  @IsString()
  addressId: string;
  // @Max(90)
  // @Min(-90)
  lat: number;
  // @Max(180)
  // @Min(-180)
  lng: number;
  @IsString()
  @MaxLength(100)
  title: string;
  content: string;
  @IsMongoId()
  locationId: string;
  @IsMongoId()
  placeId: string;
}
