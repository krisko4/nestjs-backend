import { Place } from '../schemas/place.schema';

export class PlaceDto extends Place {
  isUserOwner: boolean;
}
