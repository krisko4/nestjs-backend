import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Transform } from 'class-transformer';
import mongoose, { Document } from 'mongoose';
import { Place } from 'src/place/schemas/place.schema';
import { User } from 'src/user/schemas/user.schema';

export type PointsTransactionDocument = PointsTransaction & Document;

export enum PointsTransactionType {
  COUPON_SCAN = 'COUPON_SCAN',
  EVENT_PARTICIPATION = 'EVENT_PARTICIPATION',
  PRIZE_REDEMPTION = 'PRIZE_REDEMPTION',
}

export type CreatePointsTransactionSchema = {
  user: mongoose.Types.ObjectId;
  place: mongoose.Types.ObjectId;
  points: number;
  type: PointsTransactionType;
  sourceId: mongoose.Types.ObjectId;
};

@Schema()
export class PointsTransaction {
  @Transform((params) => params.obj._id.toString())
  _id: string;
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name, required: true })
  user: User;
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Place.name, required: true })
  place: Place;
  @Prop({ type: Number, required: true })
  points: number;
  @Prop({ required: true, enum: Object.values(PointsTransactionType) })
  type: PointsTransactionType;
  @Prop({ type: mongoose.Schema.Types.ObjectId, required: true })
  sourceId: mongoose.Types.ObjectId;
  @Prop({ default: Date.now })
  createdAt: Date;
}

export const PointsTransactionSchema = SchemaFactory.createForClass(PointsTransaction);
