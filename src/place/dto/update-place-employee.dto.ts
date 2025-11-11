import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PlaceEmployeeRole } from '../schemas/place-employee.schema';

export class UpdatePlaceEmployeeDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(PlaceEmployeeRole)
  @IsOptional()
  role?: PlaceEmployeeRole;
}
