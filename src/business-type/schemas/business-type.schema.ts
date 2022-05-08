import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Exclude } from 'class-transformer';
import { Document } from 'mongoose';

export type BusinessTypeDocument = BusinessType & Document;

@Schema()
export class BusinessType {
  @Exclude()
  @Prop()
  _id?: string;
  @Prop({ required: true, unique: true })
  name: string;
}

export const BusinessTypeSchema = SchemaFactory.createForClass(BusinessType);
