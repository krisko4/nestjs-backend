import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { CreateLocationDto } from './create-location.dto';

export class CreatePlaceDto {
  @IsString()
  @MaxLength(50)
  @MinLength(1)
  name: string;
  @MinLength(1)
  @IsOptional()
  description: string;
  @Transform(({ value }) => JSON.parse(value))
  locations: CreateLocationDto[];
}
