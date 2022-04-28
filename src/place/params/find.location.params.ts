import { IsMongoId } from 'class-validator';

export class FindLocationParams {
  @IsMongoId()
  id: string;
  @IsMongoId()
  locationId: string;
}
