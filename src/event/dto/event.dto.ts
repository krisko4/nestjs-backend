import { Transform } from 'class-transformer';
import { format } from 'date-fns';
import { Event } from '../schemas/event.schema';

export class EventDto extends Event {
  @Transform(({ value }) => format(value, 'yyyy-MM-dd hh:mm'))
  startDate: Date;
  @Transform(({ value }) => format(value, 'yyyy-MM-dd hh:mm'))
  endDate: Date;
  @Transform(({ value }) => `${process.env.CLOUDI_URL}/${value}`)
  img: string;
}
