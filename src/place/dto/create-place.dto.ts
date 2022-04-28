import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
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
  @MinLength(1)
  description: string;
  @Matches(/^(true|false)$/)
  isBusinessChain: boolean;
  locations: CreateLocationDto[];
}
