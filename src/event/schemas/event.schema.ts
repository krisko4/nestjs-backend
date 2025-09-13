import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Exclude, plainToInstance, Transform } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import mongoose from 'mongoose';
import { Document } from 'mongoose';
import { User } from 'src/user/schemas/user.schema';
import { Place } from 'src/place/schemas/place.schema';

export type EventDocument = Event & Document;

@Schema({ _id: false })
export class Participator {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name })
  user: User;
  @Prop({ default: false })
  didReallyParticipate: boolean;
  @Prop()
  rate: number;
  isSubscriber?: boolean;
}

export const ParticipatorSchema = SchemaFactory.createForClass(Participator);

@Schema()
export class Event {
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
  @Prop()
  address: string;
  @Prop()
  addressId: string;
  @Prop()
  lat: number;
  @Prop()
  lng: number;
  @Transform((params) => plainToInstance(Place, params.obj.place))
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Place.name })
  place: Place;
  @Prop({ type: [ParticipatorSchema], required: true, default: [] })
  @ValidateNested()
  @Transform((params) => {
    const { participators } = params.obj;
    return participators.map((par) => ({
      ...par,
      user: plainToInstance(User, par.user),
    }));
  })
  participators: Participator[];
}

export const EventSchema = SchemaFactory.createForClass(Event);
