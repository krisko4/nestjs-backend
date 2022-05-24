import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Exclude, plainToInstance, Transform } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import mongoose from 'mongoose';
import { Document } from 'mongoose';
import { User } from 'src/user/schemas/user.schema';
import { Location } from 'src/place/schemas/location.schema';
import { Place } from 'src/place/schemas/place.schema';

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
  @Exclude()
  __v?: number;
  @Prop({ type: mongoose.Schema.Types.ObjectId })
  @Transform((params) => params.obj.locationId.toString())
  locationId: string;
  @Transform((params) => plainToInstance(Place, params.obj.place))
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Place.name })
  place: Place;
  @Prop({ type: [mongoose.Schema.Types.ObjectId], ref: User.name })
  @ValidateNested()
  @Transform((params) => {
    const { participators } = params.obj;
    return participators.map((par) => plainToInstance(User, par));
  })
  participators: User[];
}

export const EventSchema = SchemaFactory.createForClass(Event);
