import { IsOptional, IsString } from 'class-validator';
import { PaginationQuery } from 'src/client/dto/pagination.query';

export class ParticipatorsFilterQuery extends PaginationQuery {
  @IsOptional()
  @IsString()
  email?: string;
}
