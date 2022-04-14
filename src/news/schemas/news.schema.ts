import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { Document } from 'mongoose';

export type NewsDocument = News & Document;

@Schema()
export class News {
  @Prop({ required: true })
  title: string;
  @Prop({ required: true })
  date: Date;
  @Prop({ required: true })
  content: string;
  @Prop({ type: mongoose.Schema.Types.ObjectId })
  locationId: string;
}

export const NewsSchema = SchemaFactory.createForClass(News);
