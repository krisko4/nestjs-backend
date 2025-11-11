import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PlaceEmployeeRole } from '../schemas/place-employee.schema';

export class UpdatePlaceEmployeeDto {
  @IsEnum(PlaceEmployeeRole)
  @IsOptional()
  role?: PlaceEmployeeRole;

  @IsString()
  @IsOptional()
  name?: string;
}
