import { IsEmail, IsMongoId } from 'class-validator';

export class CreateInvitationDto {
  @IsEmail({ message: 'INVALID_EMAIL' })
  invitedEmail: string;
  @IsMongoId()
  referralId: string;
}
