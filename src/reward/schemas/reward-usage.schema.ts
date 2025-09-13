import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { plainToInstance, Transform } from 'class-transformer';
import mongoose from 'mongoose';
import { User } from 'src/user/schemas/user.schema';

@Schema({ _id: false })
export class RewardUsage {
  @Transform((params) => plainToInstance(User, params.obj.user))
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name })
  user: User;
  @Prop({ default: Date.now })
  date: Date;
}

export const RewardUsageSchema = SchemaFactory.createForClass(RewardUsage);
