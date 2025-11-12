import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Exclude, plainToInstance, Transform } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import mongoose from 'mongoose';
import { Document } from 'mongoose';
import { User } from 'src/user/schemas/user.schema';
import { Place } from 'src/place/schemas/place.schema';
import { Participator, ParticipatorSchema } from './participator.schema';

export type EventDocument = Event & Document;

export type CreateEventSchema = {
  title: string;
  startDate: Date;
  endDate: Date;
  content: string;
  img?: string;
  place: string;
  locationIds: string[];
};

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
  @Transform(({ value }) => `${process.env.CLOUDI_URL}/${value}`)
  img: string;
  @Exclude()
  __v?: number;
  @Prop({ type: [mongoose.Schema.Types.ObjectId], required: true, default: [] })
  @Transform((params) =>
    params.obj.locationIds.map((id: mongoose.Types.ObjectId) => id.toString()),
  )
  locationIds: string[];
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
