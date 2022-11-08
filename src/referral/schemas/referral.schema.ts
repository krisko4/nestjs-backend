import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Transform } from 'class-transformer';
import mongoose from 'mongoose';
import { Document } from 'mongoose';

export type ReferralDocument = Referral & Document;

@Schema()
export class Referral {
  @Transform((params) => params.obj._id.toString())
  _id: string;
  @Prop({ required: true, type: mongoose.Schema.Types.ObjectId })
  @Transform((params) => params.obj.locationId.toString())
  locationId: string;
  @Prop({ default: Date.now })
  createdAt: Date;
  @Prop({ required: true })
  description: string;
  @Prop({ required: true })
  requiredMembersCount: number;
}

export const ReferralSchema = SchemaFactory.createForClass(Referral);
