import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { plainToInstance, Transform } from 'class-transformer';
import { IsEnum } from 'class-validator';
import mongoose, { Types } from 'mongoose';
import { User } from 'src/user/schemas/user.schema';

export enum PlaceEmployeeRole {
  EMPLOYEE = 'EMPLOYEE',
  BOSS = 'BOSS',
}

export enum PlaceEmployeeStatus {
  ACTIVE = 'ACTIVE',
  WAITING_FOR_CONFIRMATION = 'WAITING_FOR_CONFIRMATION',
}

export type CreatePlaceEmployeeSchema = {
  user?: Types.ObjectId;
  role: PlaceEmployeeRole;
  name?: string;
  status: PlaceEmployeeStatus;
  email: string;
};

@Schema()
export class PlaceEmployee {
  @Transform((params) => params.obj._id.toString())
  _id: string;
  @Transform((params) => plainToInstance(User, params.obj.user))
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  user?: Types.ObjectId;
  @Prop()
  name?: string;
  @Prop({ required: true, enum: PlaceEmployeeRole })
  @IsEnum(PlaceEmployeeRole)
  role: PlaceEmployeeRole;
  @Prop({ required: true, enum: PlaceEmployeeStatus })
  @IsEnum(PlaceEmployeeStatus)
  status: PlaceEmployeeStatus;
  @Prop({ required: true })
  email: string;
}

export type PlaceEmployeePopulated = Omit<PlaceEmployee, 'user'> & {
  user?: User;
} & Document;

export const PlaceEmployeeSchema = SchemaFactory.createForClass(PlaceEmployee);
