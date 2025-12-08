import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Types } from 'mongoose';
import { Document } from 'mongoose';
import { Reward } from 'src/reward/schemas/reward.schema';
import { User } from 'src/user/schemas/user.schema';

export type CodeDocument = Code & Document;

export type CreateCodeSchema = {
  value: string;
  user: Types.ObjectId;
  reward?: Types.ObjectId;
  invitation?: Types.ObjectId;
  locationId?: Types.ObjectId;
};

@Schema()
export class Code {
  @Prop({ required: true })
  value: string;
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name })
  user: User;
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Reward.name })
  reward?: Reward;
  @Prop({ type: mongoose.Schema.Types.ObjectId })
  locationId?: Types.ObjectId;
  @Prop({ default: Date.now })
  createdAt: Date;
  @Prop()
  usedAt?: Date;
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name })
  usedBy?: User;
}

export const CodeSchema = SchemaFactory.createForClass(Code);
