import { IsMongoId } from 'class-validator';

export class CreateVisitDto {
  @IsMongoId()
  locationId: string;
}
