import { IsArray, IsBoolean, IsEnum, IsMongoId, IsNumber, IsOptional, MaxLength, Min } from 'class-validator';
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

  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsNumber()
  @Min(1)
  points?: number;
}
