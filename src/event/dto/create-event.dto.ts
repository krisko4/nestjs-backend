import { Transform } from 'class-transformer';
import { IsArray, IsMongoId, IsNumber, IsOptional, MaxLength, Min } from 'class-validator';

export class CreateEventDto {
  @MaxLength(100)
  title: string;
  content: string;
  startDate: Date;
  endDate?: Date;
  @Transform(({ value }) => (Array.isArray(value) ? value : [value].filter(Boolean)))
  @IsArray()
  @IsMongoId({ each: true })
  locationIds: string[];

  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsNumber()
  @Min(1)
  points?: number;
}
