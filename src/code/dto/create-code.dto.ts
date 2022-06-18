import { IsMongoId, IsOptional } from 'class-validator';

export class CreateCodeDto {
  @IsMongoId()
  userId: string;
  @IsMongoId()
  @IsOptional()
  rewardId?: string;
}
