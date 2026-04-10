import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { plainToInstance, Transform } from 'class-transformer';
import mongoose, { Document } from 'mongoose';
import { Event } from 'src/event/schemas/event.schema';
import { Place } from 'src/place/schemas/place.schema';

export type RewardDocument = Reward & Document;

export enum RewardAvailableFor {
  ALL = 'ALL',
  CURRENT_SUBSCRIBERS = 'CURRENT_SUBSCRIBERS',
  ALL_SUBSCRIBERS = 'ALL_SUBSCRIBERS',
  SELECTED_USERS = 'SELECTED_USERS',
  TOP_ACTIVE_USERS = 'TOP_ACTIVE_USERS',
  LEAST_ACTIVE_USERS = 'LEAST_ACTIVE_USERS',
  CURRENT_CLIENTS = 'CURRENT_CLIENTS',
  ALL_CLIENTS = 'ALL_CLIENTS',
  INACTIVE = 'INACTIVE',
}

export enum RewardStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export type CreateRewardSchema = {
  name: string;
  description: string;
  availableFor: RewardAvailableFor;
  locationIds: string[];
  event: string;
  place: string;
  selectedUserIds?: string[];
  userLimit?: number;
  usageLimit?: number | null;
  status?: RewardStatus;
  lastScanDate?: string;
  points?: number;
  pointsCost?: number;
};

@Schema()
export class Reward {
  @Transform((params) => params.obj._id.toString())
  _id: string;
  @Prop()
  date?: Date;
  @Prop({ required: true })
  name: string;
  @Prop({ required: true })
  description: string;
  @Prop({
    ref: Event.name,
    type: mongoose.Schema.Types.ObjectId,
  })
  event: Event;
  @Transform((params) => plainToInstance(Place, params.obj.place))
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Place.name })
  place: Place;
  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId }] })
  @Transform(
    (params) =>
      params.obj.locationIds?.map((id: mongoose.Types.ObjectId) =>
        id.toString(),
      ) || [],
  )
  locationIds: string[];
  @Prop({ required: true, enum: Object.values(RewardAvailableFor) })
  availableFor: RewardAvailableFor;
  @Transform(
    (params) =>
      params.obj.selectedUserIds?.map((id: mongoose.Types.ObjectId) =>
        id.toString(),
      ) || [],
  )
  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] })
  selectedUserIds?: mongoose.Types.ObjectId[];
  @Prop({ type: Number })
  userLimit?: number;
  @Prop({ type: Number, default: null })
  usageLimit?: number | null;
  @Prop({
    required: true,
    enum: Object.values(RewardStatus),
    default: RewardStatus.ACTIVE,
  })
  status: RewardStatus;
  @Prop({ type: String })
  lastScanDate?: string;
  @Prop({ type: Number })
  points?: number;
  @Prop({ type: Number })
  pointsCost?: number;
  @Prop({ default: Date.now })
  createdAt: Date;
}

export const RewardSchema = SchemaFactory.createForClass(Reward);
