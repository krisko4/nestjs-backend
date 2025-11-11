import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
} from 'class-validator';
import { PlaceEmployeeRole } from '../schemas/place-employee.schema';

export class UpdatePlaceEmployeeDto {
  @IsEnum(PlaceEmployeeRole)
  @IsOptional()
  role?: PlaceEmployeeRole;

  @IsString()
  @IsOptional()
  name?: string;

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  locationIds?: string[];
}
