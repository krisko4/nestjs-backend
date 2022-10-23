import { UserModule } from 'src/user/user.module';
import { forwardRef, Module } from '@nestjs/common';
import { EventService } from './event.service';
import { EventController } from './event.controller';
import { MulterModule } from '@nestjs/platform-express';
import { MulterConfigService } from 'src/multer-config/multer-config.service';
import { EventRepository } from './event.repository';
import { PlaceModule } from 'src/place/place.module';
import { EventSchema } from './schemas/event.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { SubscriptionModule } from 'src/subscription/subscription.module';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [
    MulterModule.registerAsync({
      useClass: MulterConfigService,
    }),
    MongooseModule.forFeature([{ name: Event.name, schema: EventSchema }]),
    PlaceModule,
    UserModule,
    CloudinaryModule,
    SubscriptionModule,
    forwardRef(() => NotificationModule),
  ],
  controllers: [EventController],
  providers: [EventService, EventRepository],
  exports: [EventService],
})
export class EventModule {}
