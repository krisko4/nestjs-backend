import { IsEmail, IsString, Max, MaxLength } from 'class-validator';

export class CreateContactDto {
  @IsString()
  @MaxLength(40)
  name: string;
  @IsEmail()
  email: string;
  @IsString()
  @MaxLength(1000)
  content: string;
}
