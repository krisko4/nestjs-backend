import {
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LocationAssignmentDto } from './create-place-employee.dto';

export class UpdatePlaceEmployeeDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LocationAssignmentDto)
  @IsOptional()
  locations?: LocationAssignmentDto[];
}
