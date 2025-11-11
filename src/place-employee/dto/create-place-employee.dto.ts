import {
  IsArray,
  IsEmail,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  Min,
  MinLength,
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

  @IsArray()
  @IsMongoId({ each: true })
  locationIds: string[];
}
