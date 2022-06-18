import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

export type RewardDocument = Reward & Document;

@Schema()
export class Reward {
  @Prop()
  date?: Date;
  @Prop()
  scheduledFor?: Date;
  @Prop({ required: true })
  description: string;
  @Prop({ required: true, unique: true, type: mongoose.Schema.Types.ObjectId })
  eventId: string;
  @Prop({ required: true, type: Number })
  rewardPercentage: number;
}

export const RewardSchema = SchemaFactory.createForClass(Reward);
