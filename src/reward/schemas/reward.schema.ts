import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { Event } from 'src/event/schemas/event.schema';

export type RewardDocument = Reward & Document;

@Schema()
export class Reward {
  @Prop()
  date?: Date;
  @Prop()
  scheduledFor?: Date;
  @Prop({ required: true })
  description: string;
  @Prop({
    required: true,
    unique: true,
    ref: Event.name,
    type: mongoose.Schema.Types.ObjectId,
  })
  event: Event;
  @Prop({ required: true, type: Number })
  rewardPercentage: number;
}

export const RewardSchema = SchemaFactory.createForClass(Reward);
