import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { User } from 'src/user/schemas/user.schema';

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
