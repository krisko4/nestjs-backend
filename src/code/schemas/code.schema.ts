import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { Document } from 'mongoose';
import { Invitation } from 'src/invitation/schemas/invitation.schema';
import { Reward } from 'src/reward/schemas/reward.schema';
import { User } from 'src/user/schemas/user.schema';

export type CodeDocument = Code & Document;

@Schema()
export class Code {
  @Prop({ required: true })
  value: string;
  @Prop({ default: false })
  isExpired: boolean;
  @Prop({ default: false })
  isUsed: boolean;
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name })
  user: User;
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Reward.name })
  reward?: Reward;
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Invitation.name })
  invitation?: Invitation;
}

export const CodeSchema = SchemaFactory.createForClass(Code);
