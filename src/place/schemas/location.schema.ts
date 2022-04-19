import { Schema, Prop } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { OpeningHours } from './opening-hours.schema';

@Schema()
export class Location {
  @Prop({ type: mongoose.Schema.Types.ObjectId, auto: true })
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
  email: string;
  @Prop()
  website: string;
  @Prop({ default: false })
  alwaysOpen: boolean;
  @Prop({ default: 'closed', enum: ['open', 'closed'] })
  status: string;
  @Prop()
  openingHours: OpeningHours;
  @Prop({ default: false })
  isActive: boolean;
  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true })
  userId: string;
  @Prop({default: 0})
  visitCount: number
}
