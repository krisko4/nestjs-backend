import { IsEnum, IsMongoId, IsOptional, IsString } from 'class-validator';

export enum CodeType {
  REWARD = 'reward',
  REFERRAL = 'referral',
}

export class CodeFilterQuery {
  @IsMongoId()
  @IsOptional()
  rewardId?: string;
  @IsString()
  @IsOptional()
  value?: string;
  @IsMongoId()
  @IsOptional()
  locationId?: string;
  @IsEnum(CodeType)
  @IsOptional()
  type?: CodeType;
}
