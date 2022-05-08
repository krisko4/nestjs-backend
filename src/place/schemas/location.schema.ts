import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Exclude, Transform } from 'class-transformer';
import mongoose from 'mongoose';
import { AverageNote, AverageNoteSchema } from './average-note.schema';
import { OpeningHours, OpeningHoursSchema } from './opening-hours.schema';

@Schema()
export class Location {
  @Transform((params) => params.obj._id.toString())
  _id: string;
  @Prop({ required: true })
  address: string;
  @Prop({ required: true })
  addressId: string;
  @Prop({ required: true })
  lat: number;
  @Prop({ required: true })
  lng: number;
  @Prop()
  facebook: string;
  @Prop()
  instagram: string;
  @Prop()
  email: string;
  @Prop()
  website: string;
  @Prop({ default: false })
  alwaysOpen: boolean;
  @Prop({ default: 'closed', enum: ['open', 'closed'] })
  status: string;
  @Prop({ type: OpeningHoursSchema })
  openingHours: OpeningHours;
  @Prop({ default: false })
  isActive: boolean;
  @Prop({ default: 0 })
  visitCount: number;
  @Prop({ type: AverageNoteSchema })
  averageNote: AverageNote;
}

export const LocationSchema = SchemaFactory.createForClass(Location);
