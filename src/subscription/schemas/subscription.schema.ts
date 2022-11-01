import { User } from 'src/user/schemas/user.schema';
import { Types, Document } from 'mongoose';
import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';

export type SubscriptionDocument = Subscription & Document;
@Schema()
export class Subscription {
  @Prop({ required: true, type: Types.ObjectId, ref: User.name })
  user: User;
  @Prop({ required: true, type: Types.ObjectId })
  locationId: string;
  @Prop({ default: new Date() })
  subscribedAt: Date;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);
