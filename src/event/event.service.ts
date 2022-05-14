import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { isBefore } from 'date-fns';
import { PlaceService } from 'src/place/place.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventRepository } from './event.repository';
import { EventFilterQuery } from './queries/event-filter.query';

@Injectable()
export class EventService {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly placeService: PlaceService,
  ) {}
  async create(createEventDto: CreateEventDto) {
    const { startDate, endDate, locationId } = createEventDto;
    const place = await this.placeService.findByLocationId(locationId);
    if (!place)
      throw new NotFoundException(`location with id: ${locationId} not found`);
    if (isBefore(new Date(endDate), new Date(startDate)))
      throw new BadRequestException(
        'Event should not end before it has started',
      );
    return this.eventRepository.createEvent(createEventDto);
  }

  findByQuery(eventFilterQuery: EventFilterQuery) {
    const { locationId } = eventFilterQuery;
    if (locationId) return this.eventRepository.findByLocationId(locationId);
    return this.eventRepository.find();
  }

  findOne(id: number) {
    return `This action returns a #${id} event`;
  }

  update(id: number, updateEventDto: UpdateEventDto) {
    return `This action updates a #${id} event`;
  }

  remove(id: number) {
    return `This action removes a #${id} event`;
  }
}
