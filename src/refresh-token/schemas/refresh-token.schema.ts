import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { User } from 'src/user/schemas/user.schema';

export type RefreshTokenDocument = Document & RefreshToken;

@Schema()
export class RefreshToken {
  @Prop({ type: mongoose.Schema.Types.ObjectId, auto: true })
  _id: string;
  @Prop({ required: true })
  value: string;
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: User.name,
  })
  user: string;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);
