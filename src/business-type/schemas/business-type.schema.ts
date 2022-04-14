import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BusinessTypeDocument = BusinessType & Document;

@Schema()
export class BusinessType {
  @Prop({ required: true, unique: true })
  name: string;
}

export const BusinessTypeSchema = SchemaFactory.createForClass(BusinessType);
