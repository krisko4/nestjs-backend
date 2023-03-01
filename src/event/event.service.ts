import {
  StatisticsFilterQuery,
  StatisticsType,
} from './queries/statistics-filter.query';
import { UpdateParticipatorDto } from './dto/update-participator.dto';
import { Event, EventDocument } from './schemas/event.schema';
import { Haversine } from './../haversine/haversine';
import { CreateNotificationDto } from './../notification/dto/create-notification.dto';
import { UserService } from 'src/user/user.service';
import { GeolocationDto } from './../geolocation/dto/geolocation.dto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { addDays, format, isBefore, isToday, addMinutes } from 'date-fns';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationType } from 'src/notification/schemas/notification.schema';
import { PaginationQuery } from 'src/place/queries/pagination.query';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { CreateEventDto } from './dto/create-event.dto';
import { EventRepository } from './event.repository';
import { EventFilterQuery } from './queries/event-filter.query';
import { PlaceService } from 'src/place/place.service';
import { InjectConnection } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';

@Injectable()
export class EventService {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly placeService: PlaceService,
    private readonly userService: UserService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly subscriptionService: SubscriptionService,
    private readonly notificationService: NotificationService,
    @InjectConnection() private readonly connection: mongoose.Connection,
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
    let event: EventDocument;
    const session = await this.connection.startSession();
    await session.withTransaction(async () => {
      if (img) {
        imageId = await this.cloudinaryService.uploadImage(img.path, 'events');
      }
      event = await this.eventRepository.createEvent(
        createEventDto,
        session,
        imageId,
      );
      const subs = await this.subscriptionService.findByLocationId(locationId);
      const receivers = subs.map((sub) => sub.user._id);
      if (receivers.length > 0) {
        const createNotificationDto = {
          title: `${place.name} has added a new event! 🎉`,
          body: `Name: ${title}\nStarts: ${format(
            new Date(startDate),
            'yyyy-MM-dd HH:mm',
          )}`,
          eventId: event._id.toString(),
          locationId,
          receivers,
          type: NotificationType.NEW_EVENT,
        };
        const notification = await this.notificationService.create(
          createNotificationDto,
          session,
        );
        const { body, eventId } = createNotificationDto;
        await this.notificationService.sendNotification(receivers, {
          data: {
            _id: notification._id.toString(),
            title,
            body,
            startDate: format(new Date(startDate), 'yyyy-MM-dd hh:mm'),
            endDate: format(new Date(endDate), 'yyyy-MM-dd hh:mm'),
            eventId,
            locationName: place.name,
            img: `${process.env.CLOUDI_URL}/${imageId}`,
          },
          notification: {
            title: createNotificationDto.title,
            body,
            image: `${process.env.CLOUDI_URL}/${imageId}`,
          },
        });
      }
      const rateRequestJob = new CronJob(
        addMinutes(new Date(endDate), 5),
        () => {
          this.sendRateRequestNotifications(event._id);
        },
      );
      this.schedulerRegistry.addCronJob(new Date().toString(), rateRequestJob);
    });
    await session.endSession();
    return event;
  }

  async sendRateRequestNotifications(eventId: string) {
    const event = await this.eventRepository.findEventById(eventId);
    if (!event) throw new InternalServerErrorException(`EVENT_NOT_FOUND`);
    const subs = await this.subscriptionService.findByLocationId(
      event.locationId,
    );
    const receivers = subs.map((sub) => sub.user._id);
    if (receivers.length > 0) {
      const createNotificationDto = {
        title: `Hey, have you enjoyed the event: ${event.title}?🤠`,
        body: `Let us know, we can't wait to hear your opinion!🤔`,
        eventId: event._id.toString(),
        receivers,
        type: NotificationType.NEW_EVENT,
      };
      const notification = await this.notificationService.create(
        createNotificationDto,
      );
      const { body, eventId } = createNotificationDto;
      await this.notificationService.sendNotification(receivers, {
        data: {
          _id: notification._id.toString(),
          body,
          eventId,
        },
        notification: {
          title: createNotificationDto.title,
          body,
        },
      });
    }
  }

  async findByLocationId(locationId: string) {
    return this.eventRepository.findByLocationId(locationId);
  }

  async findById(id: string, uid?: string) {
    const event = await this.eventRepository.findEventById(id);
    if (!event) throw new InternalServerErrorException(`EVENT_NOT_FOUND`);
    const subs = await this.subscriptionService.findByLocationId(
      event.locationId,
    );
    event.participators.forEach((participator) => {
      participator['isSubscriber'] = subs.some(({ user }) => {
        return user._id.toString() === participator.user._id.toString();
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
      await this.notificationService.hasUserAlreadyReceivedNearbyEventsNotification(
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
        body: `Starts: ${format(event.startDate, 'yyyy-MM-dd HH:mm')}`,
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
    const notification = await this.notificationService.create(
      createNotificationDto,
    );
    const { receivers, title, body } = createNotificationDto;
    return this.notificationService.sendNotification(receivers, {
      data: {
        _id: notification._id.toString(),
      },
      notification: {
        title,
        body,
      },
    });
  }

  async addParticipator(id: string, uid: string) {
    const event = await this.eventRepository.findById(id);
    if (!event) throw new InternalServerErrorException(`EVENT_NOT_FOUND`);
    if (isBefore(new Date(event.endDate), new Date())) {
      throw new InternalServerErrorException('EVENT_HAS_ENDED');
    }
    // if (participatedEvent)
    //   throw new InternalServerErrorException(`USER_ALREADY_PARTICIPATES`);
    return this.eventRepository.addParticipator(id, uid);
  }

  async findStatistics(query: StatisticsFilterQuery) {
    const { locationId, type } = query;
    const events = await this.findByLocationId(locationId);
    if (type === StatisticsType.NOTIFICATIONS) {
      return this.notificationService.findNotificationStatistics(
        events.map((e) => e._id),
      );
    }
    return events.map((event) => {
      return {
        eventName: event.title,
        participators: event.participators.length,
        realParticipators: event.participators.filter(
          (p) => p.didReallyParticipate,
        ).length,
      };
    });
  }

  async updateParticipator(
    id: string,
    participatorId: string,
    uid: string,
    updateParticipatorDto?: UpdateParticipatorDto,
  ) {
    const event = await this.eventRepository.findEventById(id);
    if (!event) throw new InternalServerErrorException(`EVENT_NOT_FOUND`);
    const { rate } = updateParticipatorDto;
    console.log(rate);
    if (rate) {
      return this.rateEvent(uid, participatorId, rate, event);
    }
    console.log('alo');
    return this.markParticipationIRL(participatorId, uid, event);
  }

  async rateEvent(
    uid: string,
    participatorId: string,
    rate: number,
    event: Event,
  ) {
    if (uid.toString() !== participatorId.toString()) {
      throw new UnauthorizedException('INVALID_PARTICIPATOR_ID');
    }
    if (
      !event.participators.some(
        (p) => p.user._id.toString() === participatorId.toString(),
      )
    ) {
      throw new InternalServerErrorException('PARTICIPATOR_NOT_FOUND');
    }
    this.eventRepository.rateEvent(event._id, participatorId, rate);
  }

  async markParticipationIRL(
    participatorId: string,
    uid: string,
    event: Event,
  ) {
    const organizerId = event.place.userId;
    console.log('lkur');
    if (organizerId.toString() !== uid.toString()) {
      throw new ForbiddenException('USER_IS_NOT_ORGANIZER');
    }
    console.log(event.participators, participatorId);
    if (
      !event.participators.some(
        (par) => par.user._id.toString() === participatorId.toString(),
      )
    ) {
      throw new ForbiddenException('INVALID PARTICIPATOR_ID');
    }
    return this.eventRepository.markParticipationIRL(event._id, participatorId);
  }

  async removeParticipator(id: string, uid: string) {
    return this.eventRepository.removeParticipator(id, uid);
  }

  async findByQuery(eventFilterQuery: EventFilterQuery) {
    const { locationId, participatorId, userId, active } = eventFilterQuery;
    if (userId) {
      const places = await this.placeService.findByUserId(userId);
      const events = await this.eventRepository.findByPlacesIds(
        places.map((p) => p._id),
      );
      if (active) {
        return events.filter((e) => {
          return isBefore(new Date(), e.endDate);
        });
      }
      return events;
    }
    if (participatorId) {
      return this.eventRepository.findByParticipatorId(participatorId);
    }
    if (locationId) {
      const events = await this.findByLocationId(locationId);
      console.log(events);
      const subs = await this.subscriptionService.findByLocationId(locationId);
      events.forEach((event) => {
        event.participators.forEach((participator) => {
          participator['isSubscriber'] = subs.some(({ user }) => {
            return user._id.toString() === participator.user._id.toString();
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
