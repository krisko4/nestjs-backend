import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Transform } from 'class-transformer';
import mongoose from 'mongoose';
import { Document } from 'mongoose';
import { User } from 'src/user/schemas/user.schema';

export type ReferralDocument = Referral & Document;

@Schema({ _id: false })
class Invitation {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name })
  referrer: User;
  @Prop({ type: [mongoose.Schema.Types.ObjectId], ref: User.name })
  invitedUsers: User[];
}

const InvitationSchema = SchemaFactory.createForClass(Invitation);

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
  @Prop({ type: [InvitationSchema], default: [] })
  invitations: Invitation[];
}

export const ReferralSchema = SchemaFactory.createForClass(Referral);
