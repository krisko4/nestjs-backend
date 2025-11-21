import { Transform } from 'class-transformer';
import {
  IsArray,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateLocationDto {
  @IsMongoId()
  @IsOptional()
  _id?: string; // existing location id (optional for new locations)

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  addressId?: string;

  @IsString()
  @IsOptional()
  addressLanguage?: string;

  @IsString()
  @IsOptional()
  countryCode?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  website?: string;

  @IsString()
  @IsOptional()
  facebook?: string;

  @IsString()
  @IsOptional()
  instagram?: string;

  @IsOptional()
  lat?: number;

  @IsOptional()
  lng?: number;
}

export class UpdatePlaceDto {
  @IsString()
  @MaxLength(50)
  @MinLength(1)
  @IsOptional()
  name?: string;

  @IsString()
  @MinLength(1)
  @IsOptional()
  description?: string;

  @IsArray()
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? JSON.parse(value) : value,
  )
  locations?: UpdateLocationDto[];
}
