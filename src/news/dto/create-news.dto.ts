import {
  IsDefined,
  IsMongoId,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateNewsDto {
  @IsMongoId()
  locationId: string;
  @IsString()
  @MaxLength(100)
  title: string;
  @IsString()
  content: string;
}
