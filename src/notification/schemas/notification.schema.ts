import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Transform } from 'class-transformer';
import mongoose from 'mongoose';
import { Document } from 'mongoose';
import { User } from 'src/user/schemas/user.schema';

export type NotificationDocument = Notification & Document;

@Schema()
export class Notification {
  // @Prop({ type: mongoose.Schema.Types.ObjectId, auto:  })
  @Transform((params) => params.obj._id.toString())
  _id: string;
  @Prop({ required: true })
  title: string;
  @Prop({ default: new Date() })
  date: Date;
  @Prop({ required: true })
  content: string;
  @Prop({ type: mongoose.Schema.Types.ObjectId })
  @Transform((params) => params.obj.locationId.toString())
  locationId: string;
  @Prop({ type: [mongoose.Schema.Types.ObjectId], ref: User.name })
  receivers: User[];
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
