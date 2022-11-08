import { IsEmail } from 'class-validator';

export class UpdateInvitationDto {
  @IsEmail({ message: 'INVALID_EMAIL' })
  invitedEmail: string;
}
