import { IsEmail } from 'class-validator';

export class UpdateReferralDto {
  @IsEmail({ message: 'INVALID_EMAIL' })
  invitedEmail: string;
}
