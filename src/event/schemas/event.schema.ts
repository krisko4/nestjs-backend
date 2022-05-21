import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Transform } from 'class-transformer';
import { format } from 'date-fns';
import mongoose from 'mongoose';
import { Document } from 'mongoose';
import { User } from 'src/user/schemas/user.schema';

export type EventDocument = Event & Document;

@Schema()
export class Event {
  // @Prop({ type: mongoose.Schema.Types.ObjectId, auto:  })
  @Transform((params) => params.obj._id.toString())
  _id: string;
  @Prop({ required: true })
  title: string;
  @Prop({ required: true })
  startDate: Date;
  @Prop({ required: true })
  endDate: Date;
  @Prop({ required: true })
  content: string;
  @Prop()
  img: string;
  @Prop({ type: mongoose.Schema.Types.ObjectId })
  @Transform((params) => params.obj.locationId.toString())
  locationId: string;
  @Prop({ type: [mongoose.Schema.Types.ObjectId], ref: User.name })
  participators: User[];
}

export const EventSchema = SchemaFactory.createForClass(Event);
