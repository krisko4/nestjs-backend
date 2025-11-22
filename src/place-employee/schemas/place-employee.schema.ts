import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Transform } from 'class-transformer';
import { IsEnum } from 'class-validator';
import mongoose, { Document, Types } from 'mongoose';
import { Employee } from 'src/employee/schemas/employee.schema';
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

export type PlaceEmployeeDocument = PlaceEmployee & Document;

export type CreatePlaceEmployeeSchema = {
  employee: Types.ObjectId;
  place: Types.ObjectId;
  location?: Types.ObjectId;
  role: PlaceEmployeeRole;
  status: PlaceEmployeeStatus;
};

@Schema({ timestamps: true })
export class PlaceEmployee {
  @Transform((params) => params.obj._id.toString())
  _id: string;

  @Transform((params) => params.obj.employee?.toString())
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  })
  employee: Types.ObjectId;

  @Transform((params) => params.obj.place?.toString())
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Place', required: true })
  place: Types.ObjectId;

  @Transform((params) => params.obj.location?.toString())
  @Prop({ type: mongoose.Schema.Types.ObjectId, required: false })
  location?: Types.ObjectId;

  @Prop({ required: true, enum: PlaceEmployeeRole })
  @IsEnum(PlaceEmployeeRole)
  role: PlaceEmployeeRole;

  @Prop({ required: true, enum: PlaceEmployeeStatus })
  @IsEnum(PlaceEmployeeStatus)
  status: PlaceEmployeeStatus;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export type PlaceEmployeePopulated = Omit<
  PlaceEmployee,
  'employee' | 'place'
> & {
  employee?: Employee;
  place?: Place;
} & Document;

export const PlaceEmployeeSchema = SchemaFactory.createForClass(PlaceEmployee);
