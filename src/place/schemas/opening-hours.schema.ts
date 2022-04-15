import { Prop, Schema } from '@nestjs/mongoose';

@Schema()
class OpeningDay {
  @Prop()
  start: Date;
  @Prop()
  end: Date;
  @Prop({ default: true })
  open: boolean;
}

@Schema()
export class OpeningHours {
  @Prop()
  monday: OpeningDay;
  @Prop()
  tuesday: OpeningDay;
  @Prop()
  wednesday: OpeningDay;
  @Prop()
  thursday: OpeningDay;
  @Prop()
  friday: OpeningDay;
  @Prop()
  saturday: OpeningDay;
  @Prop()
  sunday: OpeningDay;
}
