import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Transform } from 'class-transformer';
import { IsEnum } from 'class-validator';
import mongoose, { Types } from 'mongoose';
import { Place } from 'src/place/schemas/place.schema';

export enum PlaceEmployeeRole {
  EMPLOYEE = 'EMPLOYEE',
  BOSS = 'BOSS',
}

export enum PlaceEmployeeStatus {
  ACTIVE = 'ACTIVE',
  WAITING_FOR_CONFIRMATION = 'WAITING_FOR_CONFIRMATION',
  REJECTED = 'REJECTED',
}

@Schema({ _id: false })
export class LocationAssignment {
  @Transform((params) => params.obj.locationId?.toString())
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  })
  locationId: Types.ObjectId;

  @Prop({ required: true, enum: PlaceEmployeeStatus })
  @IsEnum(PlaceEmployeeStatus)
  status: PlaceEmployeeStatus;

  @Prop({ required: true, enum: PlaceEmployeeRole })
  @IsEnum(PlaceEmployeeRole)
  role: PlaceEmployeeRole;
}

export const LocationAssignmentSchema =
  SchemaFactory.createForClass(LocationAssignment);

@Schema({ _id: false })
export class PlaceAssignment {
  @Transform((params) => params.obj.place?.toString())
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Place',
    required: true,
  })
  place: Types.ObjectId;

  @Prop({ type: String })
  name?: string;

  @Prop({ type: [LocationAssignmentSchema], default: [] })
  locations: LocationAssignment[];
}

export const PlaceAssignmentSchema =
  SchemaFactory.createForClass(PlaceAssignment);

export type PlaceAssignmentPopulated = Omit<PlaceAssignment, 'place'> & {
  place?: Place;
};
