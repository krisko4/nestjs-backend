import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Transform } from 'class-transformer';
import mongoose, { Document } from 'mongoose';
import { Place } from 'src/place/schemas/place.schema';
import { User } from 'src/user/schemas/user.schema';

export type UserPointsDocument = UserPoints & Document;

export type CreateUserPointsSchema = {
  user: mongoose.Types.ObjectId;
  place: mongoose.Types.ObjectId;
  points: number;
};

@Schema()
export class UserPoints {
  @Transform((params) => params.obj._id.toString())
  _id: string;
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name, required: true })
  user: User;
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Place.name, required: true })
  place: Place;
  @Prop({ type: Number, default: 0 })
  points: number;
  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const UserPointsSchema = SchemaFactory.createForClass(UserPoints);
UserPointsSchema.index({ user: 1, place: 1 }, { unique: true });
