import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Exclude, Transform } from 'class-transformer';
import mongoose from 'mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

export type CreateUserSchema = {
  email: string;
  password: string;
  isActive: boolean;
};

@Schema()
export class User {
  @Transform((params) => params.obj._id.toString())
  _id: string;
  @Prop()
  firstName: string;
  @Prop()
  lastName: string;
  @Prop()
  email: string;
  @Prop()
  @Exclude()
  password: string;
  @Prop({ default: false })
  @Exclude()
  isActive: boolean;
  @Prop({ default: '' })
  @Transform(({ value }) => (value ? `${process.env.CLOUDI_URL}/${value}` : ''))
  img: string;
  @Prop()
  birthdate: Date;
  @Prop()
  @Exclude()
  notificationTokens: string[];
  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId }], default: [] })
  favoriteLocationIds: mongoose.Types.ObjectId[];
  @Exclude()
  __v: number;
}

export const UserSchema = SchemaFactory.createForClass(User);
