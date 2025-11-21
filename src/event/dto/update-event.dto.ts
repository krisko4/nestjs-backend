import { IsArray, IsBoolean, IsEnum, IsMongoId, IsOptional, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { EventStatus } from '../schemas/event.schema';

export class UpdateEventDto {
  @IsOptional()
  @MaxLength(100)
  title?: string;

  @IsOptional()
  content?: string;

  @IsOptional()
  startDate?: Date;

  @IsOptional()
  endDate?: Date;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  locationIds?: string[];

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  shouldUpdateImg?: boolean;

  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;
}
