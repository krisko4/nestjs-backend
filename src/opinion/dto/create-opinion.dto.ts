import { IsMongoId, IsNumber, IsString, Max, Min } from 'class-validator';

export class CreateOpinionDto {
  @IsMongoId()
  authorId: string;
  @IsMongoId()
  locationId: string;
  @IsNumber()
  @Max(5)
  @Min(1)
  note: number;
  @IsString()
  content: string;
}
