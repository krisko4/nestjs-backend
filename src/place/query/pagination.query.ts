import { Transform, Type } from 'class-transformer';
import { IsInt, IsNumber, IsNumberString, Max, Min } from 'class-validator';

export class PaginationQuery {
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
