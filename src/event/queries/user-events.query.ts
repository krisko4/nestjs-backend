import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UserEventsQuery {
  @IsInt()
  @Type(() => Number)
  @Min(0)
  start: number;
  @IsInt()
  @Type(() => Number)
  @Min(0)
  @Max(50)
  limit: number;
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  activeOnly?: boolean;
}
