import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsNumber, IsString, Max, Min } from 'class-validator';

export class SearchPlaceQuery {
  @IsInt()
  @Type(() => Number)
  @Min(0)
  start: number;
  @IsInt()
  @Type(() => Number)
  @Min(0)
  @Max(50)
  limit: number;
  @IsNumber()
  @Type(() => Number)
  @IsNotEmpty()
  lat: number;
  @IsNumber()
  @Type(() => Number)
  @IsNotEmpty()
  lng: number;
  @IsString()
  @IsNotEmpty()
  countryCode: string;
}
