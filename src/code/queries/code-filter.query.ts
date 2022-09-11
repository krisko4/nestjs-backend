import { IsMongoId, IsOptional } from 'class-validator';

export class CodeFilterQuery {
  @IsMongoId()
  @IsOptional()
  rewardId?: string;
}
