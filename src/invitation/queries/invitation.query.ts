import { IsMongoId, IsOptional } from 'class-validator';

export class InvitationQuery {
  @IsMongoId()
  @IsOptional()
  referralId?: string;
}
