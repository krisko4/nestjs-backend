import { User } from 'src/user/schemas/user.schema';
import { Types, Document } from 'mongoose';
import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Invitation } from 'src/invitation/schemas/invitation.schema';

export type SubscriptionDocument = Subscription & Document;
@Schema()
export class Subscription {
  @Prop({ required: true, type: Types.ObjectId, ref: User.name })
  user: User;
  @Prop({ required: true, type: Types.ObjectId })
  locationId: string;
  @Prop({ default: new Date() })
  subscribedAt: Date;
  @Prop({ type: Types.ObjectId, ref: Invitation.name })
  invitation?: string;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);
