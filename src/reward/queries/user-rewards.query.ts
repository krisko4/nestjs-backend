import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class UserRewardsQuery {
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
