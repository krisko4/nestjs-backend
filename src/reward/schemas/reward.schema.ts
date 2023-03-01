import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { plainToInstance, Transform } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import mongoose, { Document } from 'mongoose';
import { Event } from 'src/event/schemas/event.schema';
import { User } from 'src/user/schemas/user.schema';

export type RewardDocument = Reward & Document;

@Schema()
export class Reward {
  @Transform((params) => params.obj._id.toString())
  _id: string;
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
  @Prop({ type: [mongoose.Schema.Types.ObjectId], ref: User.name })
  @ValidateNested()
  @Transform((params) => {
    const { participators } = params.obj;
    return participators.map((par) => plainToInstance(User, par));
  })
  participators: User[];
}

export const RewardSchema = SchemaFactory.createForClass(Reward);
