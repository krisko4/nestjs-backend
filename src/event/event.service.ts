import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { isBefore } from 'date-fns';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { NotificationService } from 'src/notification/notification.service';
import { PlaceService } from 'src/place/place.service';
import { PaginationQuery } from 'src/place/queries/pagination.query';
import { SubscriptionDocument } from 'src/subscription/schemas/subscription.schema';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { CreateEventDto } from './dto/create-event.dto';
import { EventRepository } from './event.repository';
import { EventFilterQuery } from './queries/event-filter.query';

@Injectable()
export class EventService {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly placeService: PlaceService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly subscriptionService: SubscriptionService,
    @Inject(forwardRef(() => NotificationService))
    private readonly notificationService: NotificationService,
  ) {}
  async create(createEventDto: CreateEventDto, img?: Express.Multer.File) {
    const { title, startDate, endDate, content, locationId, placeId } =
      createEventDto;
    if (isBefore(new Date(endDate), new Date(startDate))) {
      throw new BadRequestException(
        'Event should not end before it has started',
      );
    }
    const place = await this.placeService.findByLocationId(locationId);
    if (!place)
      throw new NotFoundException(`location with id: ${locationId} not found`);
    let imageId: string;
    if (img) {
      imageId = await this.cloudinaryService.uploadImage(img.path, 'events');
    }
    const event = await this.eventRepository.createEvent(
      createEventDto,
      imageId,
    );
    const subs = await this.subscriptionService.findByLocationId(locationId);
    const receivers = subs.map((sub) => sub.user._id);
    if (receivers.length > 0) {
      await this.notificationService.create({
        title,
        eventId: event._id.toString(),
        locationId,
        receivers,
      });
    }
    return event;
  }

  async findById(id: string, uid?: string) {
    const event = await this.eventRepository.findEventById(id);
    return {
      event,
      isUserOwner: uid
        ? event.place.userId.toString() === uid.toString()
        : false,
    };
  }

  async participate(id: string, uid: string) {
    if (!uid) throw new InternalServerErrorException('uid is required');
    const participatedEvent =
      await this.eventRepository.findByIdAndParticipatorId(id, uid);
    if (participatedEvent)
      throw new InternalServerErrorException(
        `User with id: ${uid} is already a participator of the event`,
      );
    return this.eventRepository.participate(id, uid);
  }

  async unparticipate(id: string, uid: string) {
    if (!uid) throw new InternalServerErrorException('uid is required');
    return this.eventRepository.unparticipate(id, uid);
  }

  findByQuery(eventFilterQuery: EventFilterQuery) {
    const { locationId, participatorId } = eventFilterQuery;
    if (participatorId) {
      return this.eventRepository.findByParticipatorId(participatorId);
    }
    if (locationId) return this.eventRepository.findByLocationId(locationId);
    return this.eventRepository.findAll();
  }

  findPopular(paginationQuery: PaginationQuery) {
    return this.eventRepository.findPopular(paginationQuery);
  }
  findToday(paginationQuery: PaginationQuery) {
    return this.eventRepository.findToday(paginationQuery);
  }
}
