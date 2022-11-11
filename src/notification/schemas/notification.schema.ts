import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Exclude, Transform, Type } from 'class-transformer';
import mongoose from 'mongoose';
import { Document } from 'mongoose';
import { Event } from 'src/event/schemas/event.schema';
import { Reward } from 'src/reward/schemas/reward.schema';
import { User } from 'src/user/schemas/user.schema';

export type NotificationDocument = Notification & Document;

export enum NotificationType {
  NEW_EVENT = 'event',
  NEW_REFERRAL = 'referral',
  REWARD = 'reward',
  EVENT_REMINDER = 'reminder',
  EVENT_TODAY_NEARBY = 'event_today_nearby',
  REFERRAL_REWARD = 'referral_reward',
}

@Schema()
class Receiver {
  @Prop()
  @Exclude()
  _id: string;
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name })
  receiver: User;
  @Prop({ default: false })
  received: boolean;
  @Prop({ default: false })
  clicked: boolean;
}

const ReceiverSchema = SchemaFactory.createForClass(Receiver);

@Schema()
export class Notification {
  @Transform((params) => params.obj._id.toString())
  _id: string;
  @Prop({ required: true })
  title: string;
  @Prop({ default: Date.now })
  date: Date;
  @Prop({ type: mongoose.Schema.Types.ObjectId })
  @Transform((params) => params.obj.locationId.toString())
  locationId: string;
  @Type(() => Receiver)
  @Prop({ required: true, type: [ReceiverSchema] })
  receivers: Receiver[];
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Event.name })
  event: Event;
  @Prop({ type: [mongoose.Schema.Types.ObjectId], ref: Event.name })
  events?: Event[];
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Reward.name })
  reward: Reward;
  @Prop({
    required: true,
    enum: [
      NotificationType.NEW_EVENT,
      NotificationType.EVENT_TODAY_NEARBY,
      NotificationType.REWARD,
      NotificationType.EVENT_REMINDER,
      NotificationType.REFERRAL_REWARD,
      NotificationType.NEW_REFERRAL,
    ],
  })
  type: NotificationType;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
