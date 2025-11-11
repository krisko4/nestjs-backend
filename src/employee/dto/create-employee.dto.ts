import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsEmail()
  email: string;
}
