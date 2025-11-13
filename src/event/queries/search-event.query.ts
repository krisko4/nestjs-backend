import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class SearchEventQuery {
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
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  activeOnly?: boolean;
}
