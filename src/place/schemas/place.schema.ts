import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { Document } from 'mongoose';
import { Location } from './location.schema';

export type PlaceDocument = Place & Document;

@Schema()
export class Place {
  @Prop({ type: mongoose.Schema.Types.ObjectId, auto: true })
  _id: string;
  @Prop({ required: true })
  name: string;
  @Prop({ required: true })
  type: string;
  @Prop({ required: true })
  logo: string;
  @Prop({ required: true })
  images: [string];
  @Prop({ required: true })
  content: string;
  @Prop({ required: true })
  subtitle: string;
  @Prop({ default: false })
  isBusinessChain: boolean;
  @Prop({ default: new Date() })
  createdAt: Date;
  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true })
  userId: string;
  @Prop()
  locations: Location[];
}

export const PlaceSchema = SchemaFactory.createForClass(Place);
