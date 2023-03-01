import { IsMongoId } from 'class-validator';

export class StatisticsFilterQuery {
  @IsMongoId()
  locationId: string;
}
