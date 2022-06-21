import { IsMongoId, IsOptional } from 'class-validator';

export class RewardFilterQuery {
  @IsMongoId()
  @IsOptional()
  userId?: string;
  @IsMongoId()
  @IsOptional()
  eventId?: string;
}
