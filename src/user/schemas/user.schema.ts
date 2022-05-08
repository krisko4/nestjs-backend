import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Exclude } from 'class-transformer';
import mongoose from 'mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema()
export class User {
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
  isActive: boolean;
  @Prop({ default: '' })
  img: string;
  @Prop()
  birthdate: Date;
  @Prop()
  notificationToken: string;
  // @Prop()
  // subscriptions: [{
  //     place: {
  //         type: mongoose.Schema.Types.ObjectId,
  //         ref: 'Place'
  //     },
  //     subscribedLocations: [{
  //         _id: mongoose.Schema.Types.ObjectId,
  //         subscribedAt: {
  //             type: Date,
  //             default: new Date()
  //         },
  //     }]
}

export const UserSchema = SchemaFactory.createForClass(User);
