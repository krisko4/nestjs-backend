import { User } from './../../user/schemas/user.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { Document } from 'mongoose';

export type OpinionDocument = Opinion & Document;

@Schema()
export class Opinion {
  @Prop({ default: Date.now })
  date: Date;
  @Prop()
  content: string;
  @Prop({ required: true, max: 5, min: 1 })
  note: number;
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: User.name,
  })
  author: User;
  @Prop({ type: mongoose.Schema.Types.ObjectId })
  locationId: string;
}

export const OpinionSchema = SchemaFactory.createForClass(Opinion);
