import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class AverageNote {
  @Prop({ default: 0 })
  ones: number;
  @Prop({ default: 0 })
  twos: number;
  @Prop({ default: 0 })
  threes: number;
  @Prop({ default: 0 })
  fours: number;
  @Prop({ default: 0 })
  fives: number;
}

export const AverageNoteSchema = SchemaFactory.createForClass(AverageNote);
