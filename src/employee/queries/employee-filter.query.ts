import { IsArray, IsMongoId, IsOptional } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PaginationQuery } from './pagination.query';

export class EmployeeFilterQuery extends PaginationQuery {
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
