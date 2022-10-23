import { Haversine } from './../haversine/haversine';
import { CreateNotificationDto } from './../notification/dto/create-notification.dto';
import { UserService } from 'src/user/user.service';
import { GeolocationDto } from './../geolocation/dto/geolocation.dto';
import { EventDocument } from 'src/event/schemas/event.schema';

import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { format, isBefore, isToday } from 'date-fns';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationType } from 'src/notification/schemas/notification.schema';
import { PlaceService } from 'src/place/place.service';
import { PaginationQuery } from 'src/place/queries/pagination.query';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { CreateEventDto } from './dto/create-event.dto';
import { EventRepository } from './event.repository';
import { EventFilterQuery } from './queries/event-filter.query';

@Injectable()
export class EventService {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly placeService: PlaceService,
    private readonly userService: UserService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly subscriptionService: SubscriptionService,
    @Inject(forwardRef(() => NotificationService))
    private readonly notificationService: NotificationService,
  ) {}
  async create(createEventDto: CreateEventDto, img?: Express.Multer.File) {
    const { title, startDate, endDate, locationId } = createEventDto;
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
        title: `${place.name} has added a new event!`,
        body: title,
        eventId: event._id.toString(),
        locationId,
        receivers,
        type: NotificationType.NEW_EVENT,
      });
    }
    return event;
  }

  async findById(id: string, uid?: string) {
    const event = await this.eventRepository.findEventById(id);
    if (!event) throw new InternalServerErrorException(`Event not found`);
    const subs = await this.subscriptionService.findByLocationId(
      event.locationId,
    );
    event.participators.forEach((participator) => {
      participator['isSubscriber'] = subs.some(({ user }) => {
        return user._id.toString() === participator._id.toString();
      });
    });
    return {
      event,
      isUserOwner: uid
        ? event.place.userId.toString() === uid.toString()
        : false,
    };
  }

  async findNearbyEventsToday(geolocationDto: GeolocationDto) {
    const { lat, lng, uid } = geolocationDto;
    const user = await this.userService.findById(uid);
    if (!user) {
      throw new InternalServerErrorException(`User with uid: ${uid} not found`);
    }
    if (
      await this.notificationService.hasUserAlreadyReceivedNearbyNotification(
        user._id,
        new Date(),
      )
    ) {
      return;
    }
    const maxDistanceInMetres = 1000;
    const userEvents = await this.eventRepository.findByParticipatorId(uid);
    const nearbyEventsToday = userEvents.filter((event) => {
      const a = { lat, lng };
      const b = {
        lat: event.lat,
        lng: event.lng,
      };
      const distance = Haversine.calculateDistance(a, b);
      return isToday(event.startDate) && distance <= maxDistanceInMetres;
    });
    let createNotificationDto: CreateNotificationDto;
    if (nearbyEventsToday.length === 0) {
      return;
    }
    if (nearbyEventsToday.length === 1) {
      const event = nearbyEventsToday[0];
      createNotificationDto = {
        title: `${event.title} will take place in your neighbourhood today!`,
        body: `Starts: ${format(event.startDate, 'yyyy-MM-dd hh:mm')}`,
        receivers: [user._id],
        eventId: event._id,
        type: NotificationType.EVENT_TODAY_NEARBY,
      };
    }
    if (nearbyEventsToday.length > 1) {
      createNotificationDto = {
        title: `${nearbyEventsToday.length} events will take place in your neighbourhood today!`,
        body: `Click me to find out`,
        receivers: [user._id],
        eventIds: nearbyEventsToday.map((e) => e._id),
        type: NotificationType.EVENT_TODAY_NEARBY,
      };
    }
    this.notificationService.create(createNotificationDto);
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

  async findByQuery(eventFilterQuery: EventFilterQuery) {
    const { locationId, participatorId } = eventFilterQuery;
    if (participatorId) {
      return this.eventRepository.findByParticipatorId(participatorId);
    }
    if (locationId) {
      const events = await this.eventRepository.findByLocationId(locationId);
      const subs = await this.subscriptionService.findByLocationId(locationId);
      events.forEach((event) => {
        event.participators.forEach((participator) => {
          participator['isSubscriber'] = subs.some(({ user }) => {
            return user._id.toString() === participator._id.toString();
          });
        });
      });
      return events;
    }
    return this.eventRepository.findAll();
  }

  findPopular(paginationQuery: PaginationQuery) {
    return this.eventRepository.findPopular(paginationQuery);
  }
  findToday(paginationQuery: PaginationQuery) {
    return this.eventRepository.findToday(paginationQuery);
  }
}
