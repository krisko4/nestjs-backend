import {
  IsArray,
  IsEmail,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PlaceEmployeeRole } from '../schemas/place-assignment.schema';

export class LocationAssignmentDto {
  @IsMongoId()
  locationId: string;

  @IsEnum(PlaceEmployeeRole)
  role: PlaceEmployeeRole;
}

export class CreatePlaceEmployeeDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsEmail()
  email: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LocationAssignmentDto)
  locations: LocationAssignmentDto[];
}
