import { Type } from 'class-transformer';
import {
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class SearchRewardQuery {
  @IsInt()
  @Type(() => Number)
  @Min(0)
  start: number;
  @IsInt()
  @Type(() => Number)
  @Min(0)
  @Max(50)
  limit: number;

  @IsOptional()
  @IsMongoId()
  locationId?: string;

  @ValidateIf((o) => !o.locationId)
  @IsNumber()
  @Type(() => Number)
  @IsNotEmpty()
  lat?: number;
  @ValidateIf((o) => !o.locationId)
  @IsNumber()
  @Type(() => Number)
  @IsNotEmpty()
  lng?: number;
  @ValidateIf((o) => !o.locationId)
  @IsString()
  @IsNotEmpty()
  countryCode?: string;
}
