import { EventModule } from 'src/event/event.module';
import { Module } from '@nestjs/common';
import { GeolocationGateway } from './geolocation.gateway';

@Module({
  imports: [EventModule],
  providers: [GeolocationGateway],
})
export class GeolocationModule {}
