import { Type } from 'class-transformer';
import { IsInt, IsMongoId, Max, Min } from 'class-validator';

export class PointsHistoryQuery {
  @IsMongoId()
  placeId: string;
  @IsInt()
  @Type(() => Number)
  @Min(0)
  start: number;
  @IsInt()
  @Type(() => Number)
  @Min(0)
  @Max(50)
  limit: number;
}
