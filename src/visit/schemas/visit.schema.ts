import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { Document } from 'mongoose';

export type VisitDocument = Visit & Document;

@Schema()
export class Visit {
  @Prop({ required: true })
  date: Date;
  @Prop({ default: 1 })
  visitCount: number;
  @Prop({ type: mongoose.Schema.Types.ObjectId })
  locationId: string;
}

export const VisitSchema = SchemaFactory.createForClass(Visit);
