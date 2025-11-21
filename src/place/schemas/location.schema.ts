import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Transform } from 'class-transformer';
import { AverageNote, AverageNoteSchema } from './average-note.schema';
import { OpeningHours, OpeningHoursSchema } from './opening-hours.schema';

export type CreateLocationSchema = {
  address: string;
  countryCode?: string;
};

@Schema()
export class Location {
  @Transform((params) => params.obj._id.toString())
  _id: string;
  @Prop()
  address: string;
  @Prop()
  addressId: string;
  @Prop()
  lat: number;
  @Prop()
  lng: number;
  @Prop()
  countryCode: string;
  @Prop()
  facebook: string;
  @Prop()
  instagram: string;
  @Prop()
  phone: string;
  @Prop()
  email: string;
  @Prop()
  website: string;
  @Prop({ default: false })
  alwaysOpen: boolean;
  @Prop({ default: 'open', enum: ['open', 'closed'] })
  status: string;
  @Prop({ type: OpeningHoursSchema })
  openingHours: OpeningHours;
  @Prop({ default: true })
  isActive: boolean;
  @Prop({ default: 0 })
  visitCount: number;
  @Prop({ type: AverageNoteSchema })
  averageNote: AverageNote;
}

export const LocationSchema = SchemaFactory.createForClass(Location);
