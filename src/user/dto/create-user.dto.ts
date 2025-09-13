import {
  IsEmail,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsOptional()
  @MaxLength(20)
  firstName: string;
  @IsString()
  @IsOptional()
  @MaxLength(30)
  lastName: string;
  @Matches(/^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/, {
    message: 'password too weak',
  })
  password: string;
  @IsEmail()
  email: string;
  @IsISO8601()
  @IsOptional()
  birthdate: Date;
}
