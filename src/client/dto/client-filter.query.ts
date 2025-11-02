import { IsOptional, IsMongoId } from 'class-validator';
import { PaginationQuery } from './pagination.query';

export class ClientFilterQuery extends PaginationQuery {
  /**
   * Opcjonalny filtr - jeśli podany, zwraca tylko klientów
   * którzy zeskanowali kody w tym konkretnym locationId
   */
  @IsOptional()
  @IsMongoId()
  locationId?: string;
}
