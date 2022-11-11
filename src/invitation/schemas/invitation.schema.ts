import { Referral } from '../../referral/schemas/referral.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Transform } from 'class-transformer';
import mongoose, { Document } from 'mongoose';
import { User } from 'src/user/schemas/user.schema';

export type InvitationDocument = Invitation & Document;

@Schema()
export class Invitation {
  @Transform((params) => params.obj._id.toString())
  _id: string;
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name })
  referrer: User;
  @Prop({ type: [mongoose.Schema.Types.ObjectId], ref: User.name })
  invitedUsers: User[];
  @Prop({ default: Date.now })
  createdAt: Date;
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Referral.name })
  referral: Referral;
}

export const InvitationSchema = SchemaFactory.createForClass(Invitation);
