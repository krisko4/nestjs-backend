import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { plainToInstance, Transform } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import mongoose, { Document } from 'mongoose';
import { Event } from 'src/event/schemas/event.schema';
import { Place } from 'src/place/schemas/place.schema';
import { RewardUsage } from './reward-usage.schema';

export type RewardDocument = Reward & Document;

export enum RewardAvailableFor {
  ALL = 'ALL',
  SUBSCRIBERS = 'SUBSCRIBERS',
}

@Schema()
export class Reward {
  @Transform((params) => params.obj._id.toString())
  _id: string;
  @Prop()
  date?: Date;
  // @Prop()
  // scheduledFor?: Date;
  // @Prop({ required: true, type: Number })
  // rewardPercentage: number;
  @Prop({ required: true })
  name: string;
  @Prop({ required: true })
  description: string;
  @Prop({
    ref: Event.name,
    type: mongoose.Schema.Types.ObjectId,
  })
  event: Event;
  // @Prop({ type: [mongoose.Schema.Types.ObjectId], ref: User.name })
  // @ValidateNested()
  // @Transform((params) => {
  //   const { participators } = params.obj;
  //   return participators.map((par) => plainToInstance(User, par));
  // })
  // participators: User[];
  @Prop({ type: [mongoose.Schema.Types.ObjectId], ref: RewardUsage.name })
  @ValidateNested()
  @Transform((params) => {
    const { usages } = params.obj;
    return usages.map((par) => plainToInstance(RewardUsage, par));
  })
  usages: RewardUsage[];
  @Transform((params) => plainToInstance(Place, params.obj.place))
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Place.name })
  place: Place;
  @Prop({ type: mongoose.Schema.Types.ObjectId })
  @Transform((params) => params.obj.locationId.toString())
  locationId: string;
  @Prop({ required: true, enum: Object.values(RewardAvailableFor) })
  availableFor: RewardAvailableFor;
  @Prop({ default: Date.now })
  createdAt: Date;
}

export const RewardSchema = SchemaFactory.createForClass(Reward);
