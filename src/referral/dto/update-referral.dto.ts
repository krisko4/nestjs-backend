import { IsEmail } from 'class-validator';

export class UpdateReferralDto {
  @IsEmail()
  invitedEmail: string;
}
