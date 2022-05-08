import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Transform, Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import mongoose from 'mongoose';
import { Document } from 'mongoose';
import { Location, LocationSchema } from './location.schema';

export type PlaceDocument = Place & Document;

@Schema()
export class Place {
  @Transform((params) => params.obj._id.toString())
  _id: string;
  @Prop({ required: true })
  name: string;
  @Prop({ required: true })
  type: string;
  @Prop({ required: true })
  @Transform(({ value }) => `${process.env.CLOUDI_URL}/${value}`)
  logo: string;
  @Prop()
  @Transform(({ value }) =>
    value.map((img: string) => `${process.env.CLOUDI_URL}/${img}`),
  )
  images: string[];
  @Prop({ required: true })
  description: string;
  @Prop({ required: true })
  subtitle: string;
  @Prop({ default: false })
  isBusinessChain: boolean;
  @Prop({ default: new Date() })
  createdAt: Date;
  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true })
  userId: string;
  @ValidateNested({ each: true })
  @Type(() => Location)
  @Prop({ required: true, type: [LocationSchema] })
  locations: Location[];
}

export const PlaceSchema = SchemaFactory.createForClass(Place);
