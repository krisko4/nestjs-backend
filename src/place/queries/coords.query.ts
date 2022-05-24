import { IsNumberString } from 'class-validator';

export class CoordsQuery {
  @IsNumberString()
  lat: number;
  @IsNumberString()
  lng: number;
}
