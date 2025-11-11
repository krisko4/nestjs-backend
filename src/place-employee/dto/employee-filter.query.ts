import { IsArray, IsMongoId, IsOptional, IsString } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class EmployeeFilterQuery {
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map((id) => id.trim());
    }
    return value;
  })
  @IsArray()
  @IsMongoId({ each: true })
  locationIds?: string[];
}
