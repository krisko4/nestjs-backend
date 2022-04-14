import { IsDefined, IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class CreateNewsDto {
  @IsMongoId()
  locationId: string;
  @IsString()
  title: string;
  @IsString()
  content: string;
}
