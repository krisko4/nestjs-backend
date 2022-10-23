import { EventService } from './../event/event.service';
import { GeolocationDto } from './dto/geolocation.dto';
import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';

@WebSocketGateway()
export class GeolocationGateway {
  constructor(private readonly eventService: EventService) {}
  @SubscribeMessage('geolocation')
  handleGeolocation(@MessageBody() data: GeolocationDto) {
    this.eventService.findNearbyEventsToday(data);
  }
}
