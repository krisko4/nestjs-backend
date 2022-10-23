import {
  IsISO8601,
  IsMongoId,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateEventDto {
  @IsISO8601()
  startDate: Date;
  @IsISO8601()
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
