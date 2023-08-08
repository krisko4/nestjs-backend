import { IsMongoId, IsEnum } from 'class-validator';

export enum StatisticsType {
  PARTICIPATORS = 'PARTICIPATORS',
  NOTIFICATIONS = 'NOTIFICATIONS',
  RATINGS = 'RATINGS',
}

export class StatisticsFilterQuery {
  @IsMongoId()
  locationId: string;
  @IsEnum(StatisticsType)
  type: StatisticsType;
}
