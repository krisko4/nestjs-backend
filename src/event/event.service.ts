import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { isBefore } from 'date-fns';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { PlaceService } from 'src/place/place.service';
import { PaginationQuery } from 'src/place/queries/pagination.query';
import { CreateEventDto } from './dto/create-event.dto';
import { EventRepository } from './event.repository';
import { EventFilterQuery } from './queries/event-filter.query';

@Injectable()
export class EventService {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly placeService: PlaceService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}
  async create(createEventDto: CreateEventDto, img?: Express.Multer.File) {
    const { startDate, endDate, locationId } = createEventDto;
    const place = await this.placeService.findByLocationId(locationId);
    if (!place)
      throw new NotFoundException(`location with id: ${locationId} not found`);
    if (isBefore(new Date(endDate), new Date(startDate))) {
      throw new BadRequestException(
        'Event should not end before it has started',
      );
    }
    let imageId: string;
    if (img) {
      imageId = await this.cloudinaryService.uploadImage(img.path, 'events');
    }
    return this.eventRepository.createEvent(createEventDto, imageId);
  }

  findByQuery(eventFilterQuery: EventFilterQuery) {
    const { locationId } = eventFilterQuery;
    console.log(locationId);
    if (locationId) return this.eventRepository.findByLocationId(locationId);
    return this.eventRepository.find();
  }

  findPopular(paginationQuery: PaginationQuery) {
    return this.eventRepository.findPopular(paginationQuery);
  }
  findToday(paginationQuery: PaginationQuery) {
    return this.eventRepository.findToday(paginationQuery);
  }
}
