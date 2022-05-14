import { IsOptional, IsString } from 'class-validator';
import { PaginationQuery } from './pagination.query';

export class PlaceFilterQuery extends PaginationQuery {
  @IsString()
  @IsOptional()
  name: string;
  @IsString()
  @IsOptional()
  type: string;
  @IsString()
  @IsOptional()
  address: string;
}