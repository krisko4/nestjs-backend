import { IsBoolean, IsISO8601, IsMongoId } from 'class-validator';

class OpeningDay {
  @IsISO8601()
  start: Date;
  @IsISO8601()
  end: Date;
  @IsBoolean()
  open: boolean;
}

export class LocationIdsDto {
  @IsMongoId({ each: true })
  locationIds: string[];
}

export class UpdateOpeningHoursDto extends LocationIdsDto {
  openingHours: {
    monday: OpeningDay;
    tuesday: OpeningDay;
    wednesday: OpeningDay;
    thursday: OpeningDay;
    friday: OpeningDay;
    saturday: OpeningDay;
    sunday: OpeningDay;
  };
}
