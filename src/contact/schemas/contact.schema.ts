import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ContactDocument = Contact & Document;

export type CreateContactSchema = {
  name: string;
  content: string;
  email: string;
};

@Schema()
export class Contact {
  @Prop({ required: true })
  name: string;
  @Prop({ default: Date.now })
  date: Date;
  @Prop({ required: true })
  content: string;
  @Prop({ required: true })
  email: string;
}

export const ContactSchema = SchemaFactory.createForClass(Contact);
