import { IsArray, IsBoolean, IsMongoId, IsOptional, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

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
}
