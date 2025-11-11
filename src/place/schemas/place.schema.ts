import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Transform, Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import mongoose from 'mongoose';
import { Document } from 'mongoose';
import {
  CreateLocationSchema,
  Location,
  LocationSchema,
} from './location.schema';

export type PlaceDocument = Place & Document;

export type CreatePlaceSchema = {
  name: string;
  subtitle?: string;
  type?: string;
  description?: string;
  isBusinessChain?: boolean;
  images?: string[];
  logo?: string;
  locations: CreateLocationSchema[];
};

@Schema()
export class Place {
  @Transform((params) => params.obj._id.toString())
  _id: string;
  @Prop({ required: true })
  name: string;
  @Prop()
  type: string;
  @Prop()
  @Transform(({ value }) => `${process.env.CLOUDI_URL}/${value}`)
  logo: string;
  @Prop()
  @Transform(({ value }) =>
    value.map((img: string) => `${process.env.CLOUDI_URL}/${img}`),
  )
  images: string[];
  @Prop()
  description: string;
  @Prop()
  subtitle: string;
  @Prop({ default: false })
  isBusinessChain: boolean;
  @Prop({ default: Date.now })
  createdAt: Date;
  @ValidateNested({ each: true })
  @Type(() => Location)
  @Prop({ required: true, type: [LocationSchema] })
  locations: Location[];
}

export const PlaceSchema = SchemaFactory.createForClass(Place);
