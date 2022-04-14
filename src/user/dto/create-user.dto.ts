import { Exclude } from 'class-transformer';
import {
  IsEmail,
  IsISO8601,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MaxLength(20)
  firstName: string;
  @IsString()
  @MaxLength(30)
  lastName: string;
  @Matches(/^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/, {
    message: 'password too weak',
  })
  password: string;
  @IsEmail()
  email: string;
  @IsISO8601()
  birthdate: Date;
}
