import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { Document } from 'mongoose';

export type ConfirmationTokenDocument = ConfirmationToken & Document;

@Schema()
export class ConfirmationToken {
  @Prop({ required: true })
  value: string;
  @Prop({ required: true })
  expiresAt: Date;
  @Prop({ required: true })
  createdAt: Date;
  @Prop({ type: mongoose.Schema.Types.ObjectId })
  userId: string;
}

export const ConfirmationTokenSchema =
  SchemaFactory.createForClass(ConfirmationToken);
