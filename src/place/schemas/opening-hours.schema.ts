import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false })
class OpeningDay {
  @Prop({ required: true })
  start: Date;
  @Prop({ required: true })
  end: Date;
  @Prop({ default: true })
  open: boolean;
}

const OpeningDaySchema = SchemaFactory.createForClass(OpeningDay);

@Schema({ _id: false })
export class OpeningHours {
  @Prop({ type: OpeningDaySchema })
  monday: OpeningDay;
  @Prop({ type: OpeningDaySchema })
  tuesday: OpeningDay;
  @Prop({ type: OpeningDaySchema })
  wednesday: OpeningDay;
  @Prop({ type: OpeningDaySchema })
  thursday: OpeningDay;
  @Prop({ type: OpeningDaySchema })
  friday: OpeningDay;
  @Prop({ type: OpeningDaySchema })
  saturday: OpeningDay;
  @Prop({ type: OpeningDaySchema })
  sunday: OpeningDay;
}

export const OpeningHoursSchema = SchemaFactory.createForClass(OpeningHours);
