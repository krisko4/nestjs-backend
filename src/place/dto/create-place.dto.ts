import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CreateLocationDto } from './create-location.dto';

export class CreatePlaceDto {
  @IsString()
  @MaxLength(50)
  @MinLength(1)
  name: string;
  @IsString()
  @MaxLength(100)
  @MinLength(1)
  subtitle: string;
  @IsString()
  @MaxLength(1000)
  @IsString()
  @IsNotEmpty()
  type: string;
  @MinLength(1)
  description: string;
  @Transform(({ value }) => JSON.parse(value))
  isBusinessChain: boolean;
  @Transform(({ value }) => JSON.parse(value))
  locations: CreateLocationDto[];
}
