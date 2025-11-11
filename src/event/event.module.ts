import { NotificationModule } from 'src/notification/notification.module';
import { UserModule } from 'src/user/user.module';
import { Module } from '@nestjs/common';
import { EventService } from './event.service';
import { MulterModule } from '@nestjs/platform-express';
import { MulterConfigService } from 'src/multer-config/multer-config.service';
import { EventRepository } from './event.repository';
import { PlaceModule } from 'src/place/place.module';
import { EventSchema } from './schemas/event.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { SubscriptionModule } from 'src/subscription/subscription.module';
import {
  Participator,
  ParticipatorSchema,
} from './schemas/participator.schema';
import { UserEventController } from './event.controller.user';
import { AdminEventController } from './event.controller.admin';
import { PlaceEmployeeModule } from 'src/place-employee/place-employee.module';

@Module({
  imports: [
    MulterModule.registerAsync({
      useClass: MulterConfigService,
    }),
    MongooseModule.forFeature([{ name: Event.name, schema: EventSchema }]),
    MongooseModule.forFeature([
      { name: Participator.name, schema: ParticipatorSchema },
    ]),
    PlaceModule,
    PlaceEmployeeModule,
    NotificationModule,
    UserModule,
    CloudinaryModule,
    SubscriptionModule,
  ],
  controllers: [UserEventController, AdminEventController],
  providers: [EventService, EventRepository],
  exports: [EventService],
})
export class EventModule {}
