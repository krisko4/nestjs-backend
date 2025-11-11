import {
  IsEmail,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
} from 'class-validator';
import { PlaceEmployeeRole } from '../schemas/place-employee.schema';

export class CreatePlaceEmployeeDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsEmail()
  email: string;

  @IsEnum(PlaceEmployeeRole)
  role: PlaceEmployeeRole;
}
