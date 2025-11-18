import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateRewardDto } from './create-reward.dto';
import { RewardStatus } from '../schemas/reward.schema';

export class UpdateRewardDto extends PartialType(CreateRewardDto) {
  @IsOptional()
  @IsEnum(RewardStatus)
  status?: RewardStatus;
}
