import { Module } from '@nestjs/common';
import { EventService } from './event.service';
import { EventController } from './event.controller';
import { MulterModule } from '@nestjs/platform-express';
import { MulterConfigService } from 'src/multer-config/multer-config.service';
import { EventRepository } from './event.repository';
import { PlaceModule } from 'src/place/place.module';
import { EventSchema } from './schemas/event.schema';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MulterModule.registerAsync({
      useClass: MulterConfigService,
    }),
    MongooseModule.forFeature([{ name: Event.name, schema: EventSchema }]),
    PlaceModule,
  ],
  controllers: [EventController],
  providers: [EventService, EventRepository],
})
export class EventModule {}
