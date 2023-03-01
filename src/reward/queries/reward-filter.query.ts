import { IsMongoId, IsOptional } from 'class-validator';

export class RewardFilterQuery {
  @IsMongoId()
  @IsOptional()
  eventId?: string;
  @IsMongoId()
  @IsOptional()
  userId?: string;
}
