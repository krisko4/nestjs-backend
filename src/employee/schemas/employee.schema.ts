import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Transform } from 'class-transformer';
import mongoose, { Document, Types } from 'mongoose';
import { User } from 'src/user/schemas/user.schema';
import {
  PlaceAssignment,
  PlaceAssignmentSchema,
  PlaceAssignmentPopulated,
} from './place-assignment.schema';

export type EmployeeDocument = Employee & Document;

export type CreateEmployeeSchema = {
  user?: Types.ObjectId;
  email: string;
};

@Schema({ timestamps: true })
export class Employee {
  @Transform((params) => params.obj._id.toString())
  _id: string;

  @Transform((params) => params.obj.user?.toString())
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    sparse: true,
    unique: true,
  })
  user?: Types.ObjectId;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ type: [PlaceAssignmentSchema], default: [] })
  places: PlaceAssignment[];

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export type EmployeePopulated = Omit<Employee, 'user' | 'places'> & {
  user?: User;
  places: PlaceAssignmentPopulated[];
} & Document;

export const EmployeeSchema = SchemaFactory.createForClass(Employee);
