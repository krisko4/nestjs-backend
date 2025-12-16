import {
  StatisticsFilterQuery,
  StatisticsType,
} from './queries/statistics-filter.query';
import { UpdateParticipatorDto } from './dto/update-participator.dto';
import { Event, EventDocument, EventStatus } from './schemas/event.schema';
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
import { format, isBefore, isToday, addMinutes } from 'date-fns';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationType } from 'src/notification/schemas/notification.schema';
import { PaginationQuery } from 'src/place/queries/pagination.query';
import { ParticipatorsFilterQuery } from './dto/participators-filter.query';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventRepository } from './event.repository';
import { EventFilterQuery } from './queries/event-filter.query';
import { PlaceService } from 'src/place/place.service';
import { InjectConnection } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { EmployeeService } from 'src/employee/employee.service';
import { SearchEventQuery } from './queries/search-event.query';
import { UserEventsQuery } from './queries/user-events.query';

@Injectable()
export class EventService {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly placeService: PlaceService,
    private readonly userService: UserService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly notificationService: NotificationService,
    private readonly employeeService: EmployeeService,
    @InjectConnection() private readonly connection: mongoose.Connection,
  ) {}

  async create(createEventDto: CreateEventDto, img?: Express.Multer.File) {
    const { title, startDate, endDate, locationIds } = createEventDto;
    if (isBefore(new Date(endDate), new Date(startDate))) {
      throw new BadRequestException(
        'Event should not end before it has started',
      );
    }

    // Weryfikujemy czy wszystkie lokacje istnieją
    const places = await Promise.all(
      locationIds.map((locationId) =>
        this.placeService.findByLocationId(locationId),
      ),
    );

    const notFoundLocationIds = locationIds.filter(
      (id, index) => !places[index],
    );
    if (notFoundLocationIds.length > 0) {
      throw new NotFoundException(
        `Locations with ids: ${notFoundLocationIds.join(', ')} not found`,
      );
    }

    // Używamy pierwszego place jako głównego miejsca (dla kompatybilności)
    const primaryPlace = places[0];

    let imageId: string;
    let event: EventDocument;
    const session = await this.connection.startSession();
    await session.withTransaction(async () => {
      if (img) {
        imageId = await this.cloudinaryService.uploadImage(img, 'events');
      }
      event = await this.eventRepository.createEvent(
        createEventDto,
        primaryPlace._id,
        session,
        imageId,
      );

      // // Zbieramy subskrybentów ze wszystkich lokacji
      // const allSubs = await Promise.all(
      //   locationIds.map((locationId) =>
      //     this.subscriptionService.findByLocationId(locationId),
      //   ),
      // );

      // // Usuwamy duplikaty użytkowników
      // const uniqueReceivers = Array.from(
      //   new Set(allSubs.flat().map((sub) => sub.user._id.toString())),
      // );

      // if (uniqueReceivers.length > 0) {
      //   const createNotificationDto = {
      //     title: `${primaryPlace.name} has added a new event! 🎉`,
      //     body: `Name: ${title}\nStarts: ${format(
      //       new Date(startDate),
      //       'yyyy-MM-dd HH:mm',
      //     )}`,
      //     eventId: event._id.toString(),
      //     locationId: locationIds[0], // dla kompatybilności
      //     receivers: uniqueReceivers,
      //     type: NotificationType.NEW_EVENT,
      //   };
      //   const notification = await this.notificationService.create(
      //     createNotificationDto,
      //     session,
      //   );
      //   const { body, eventId } = createNotificationDto;
      //   await this.notificationService.sendNotification(uniqueReceivers, {
      //     data: {
      //       _id: notification._id.toString(),
      //       title,
      //       body,
      //       startDate: format(new Date(startDate), 'yyyy-MM-dd hh:mm'),
      //       endDate: format(new Date(endDate), 'yyyy-MM-dd hh:mm'),
      //       eventId,
      //       locationName: primaryPlace.name,
      //       img: `${process.env.CLOUDI_URL}/${imageId}`,
      //     },
      //     notification: {
      //       title: createNotificationDto.title,
      //       body,
      //       image: `${process.env.CLOUDI_URL}/${imageId}`,
      //     },
      //   });
      //   const rateRequestJob = new CronJob(
      //     addMinutes(new Date(endDate), 1),
      //     () => {
      //       this.sendRateRequestNotifications(event._id);
      //     },
      //   );
      //   this.schedulerRegistry.addCronJob(
      //     new Date().toString(),
      //     rateRequestJob,
      //   );
      //   rateRequestJob.start();
      // }
    });
    await session.endSession();
    return event;
  }

  async findByLocationId(locationId: string) {
    return this.eventRepository.findByLocationId(locationId);
  }

  async findById(id: string, uid?: string) {
    const event = await this.eventRepository.findEventById(id);
    if (!event) throw new BadRequestException(`INVALID_EVENT_ID`);

    if (uid) {
      const isUserParticipator = event.participators.some((participator) => {
        return participator.user._id.toString() === uid.toString();
      });

      return {
        ...event,
        isUserParticipator,
      };
    }

    return {
      ...event,
      isUserParticipator: false,
    };
  }

  // async findNearbyEventsToday(geolocationDto: GeolocationDto) {
  //   const { lat, lng, uid } = geolocationDto;
  //   const user = await this.userService.findById(uid);
  //   if (!user) {
  //     throw new InternalServerErrorException(`User with uid: ${uid} not found`);
  //   }
  //   if (
  //     await this.notificationService.hasUserAlreadyReceivedNearbyEventsNotification(
  //       user._id,
  //       new Date(),
  //     )
  //   ) {
  //     return;
  //   }
  //   const maxDistanceInMetres = 1000;
  //   const userEvents = await this.eventRepository.findByParticipatorId(uid);
  //   const nearbyEventsToday = userEvents.filter((event) => {
  //     const a = { lat, lng };
  //     const b = {
  //       lat: event.lat,
  //       lng: event.lng,
  //     };
  //     const distance = Haversine.calculateDistance(a, b);
  //     return isToday(event.startDate) && distance <= maxDistanceInMetres;
  //   });
  //   let createNotificationDto: CreateNotificationDto;
  //   if (nearbyEventsToday.length === 0) {
  //     return;
  //   }
  //   if (nearbyEventsToday.length === 1) {
  //     const event = nearbyEventsToday[0];
  //     createNotificationDto = {
  //       title: `${event.title} will take place in your neighbourhood today!`,
  //       body: `Starts: ${format(
  //         event.startDate,
  //         'yyyy-MM-dd HH:mm',
  //       )}\nRewards planned: chicken salad 50% OFF🤩🤩\nAre you coming?🤔`,
  //       receivers: [user._id],
  //       eventId: event._id,
  //       type: NotificationType.EVENT_TODAY_NEARBY,
  //     };
  //   }
  //   if (nearbyEventsToday.length > 1) {
  //     createNotificationDto = {
  //       title: `${nearbyEventsToday.length} events will take place in your neighbourhood today!`,
  //       body: `Click me to find out`,
  //       receivers: [user._id],
  //       eventIds: nearbyEventsToday.map((e) => e._id),
  //       type: NotificationType.EVENT_TODAY_NEARBY,
  //     };
  //   }
  //   const notification = await this.notificationService.create(
  //     createNotificationDto,
  //   );
  //   const { receivers, title, body } = createNotificationDto;
  //   return this.notificationService.sendNotification(receivers, {
  //     data: {
  //       _id: notification._id.toString(),
  //     },
  //     notification: {
  //       title,
  //       body,
  //     },
  //   });
  // }

  async addParticipator(id: string, uid: string) {
    const event = await this.eventRepository.findEventById(id);
    if (!event) throw new InternalServerErrorException(`EVENT_NOT_FOUND`);
    if (isBefore(new Date(event.endDate), new Date())) {
      throw new InternalServerErrorException('EVENT_HAS_ENDED');
    }

    const isAlreadyParticipating = event.participators.some((participator) => {
      return participator.user._id.toString() === uid.toString();
    });
    if (isAlreadyParticipating) {
      throw new BadRequestException('USER_ALREADY_PARTICIPATING');
    }

    return this.eventRepository.addParticipator(id, uid);
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
    if (rate) {
      return this.rateEvent(uid, participatorId, rate, event);
    }
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
    // Sprawdź czy użytkownik jest pracownikiem tego miejsca
    const placeEmployee = await this.employeeService.findByPlaceIdAndUserId(
      event.place._id.toString(),
      uid,
    );
    if (!placeEmployee) {
      throw new ForbiddenException('USER_IS_NOT_ORGANIZER');
    }
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

  async findByQuery(userId: string, eventFilterQuery: EventFilterQuery) {
    const { locationId, participatorId, start, limit, status, placeId } =
      eventFilterQuery;
    if (userId) {
      return this.eventRepository.findByUserId(
        { start, limit },
        userId,
        status,
        placeId,
      );
    }
    if (participatorId) {
      return this.eventRepository.findByParticipatorId(participatorId);
    }
    if (locationId) {
      const events = await this.findByLocationId(locationId);
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

  async deleteById(id: string, uid: string) {
    const event = await this.findById(id);

    // Sprawdź czy użytkownik jest BOSS'em tego miejsca
    const isUserBoss = await this.employeeService.isUserBossOfPlace(
      uid,
      event.place._id.toString(),
    );
    if (!isUserBoss) {
      throw new UnauthorizedException('ILLEGAL_OPERATION');
    }
    return this.eventRepository.findByIdAndDelete(id);
  }

  async search(searchQuery: SearchEventQuery) {
    const { lat, lng, countryCode, start, limit, activeOnly } = searchQuery;

    const nearbyLocationIds =
      await this.placeService.findLocationIdsWithinRadius(lat, lng, 30000);

    if (nearbyLocationIds.length > 0) {
      return this.eventRepository.findPaginatedByLocationIds(
        { start, limit },
        nearbyLocationIds,
        activeOnly,
      );
    }

    return this.eventRepository.findPaginatedByCountryCode(
      { start, limit },
      countryCode,
      activeOnly,
    );
  }

  async findUserEvents(userEventsQuery: UserEventsQuery, userId: string) {
    const { start, limit, activeOnly } = userEventsQuery;
    return this.eventRepository.findPaginatedByParticipatorId(
      { start, limit },
      userId,
      activeOnly,
    );
  }

  async toggleEventStatus(id: string, uid: string, status: EventStatus) {
    const event = await this.findById(id);
    if (!event) {
      throw new NotFoundException('INVALID_EVENT_ID');
    }

    // Sprawdź czy użytkownik jest BOSS'em miejsca
    const isUserBoss = await this.employeeService.isUserBossOfPlace(
      uid,
      event.place._id.toString(),
    );
    if (!isUserBoss) {
      throw new UnauthorizedException('ILLEGAL_OPERATION');
    }

    // Aktualizuj status
    const updatedEvent = await this.eventRepository.updateEvent(id, {
      status,
    });

    return updatedEvent;
  }

  async findParticipators(
    eventId: string,
    filterQuery: ParticipatorsFilterQuery,
  ) {
    const result = await this.eventRepository.findPaginatedParticipators(
      eventId,
      filterQuery,
    );

    if (!result) {
      throw new NotFoundException('Event not found');
    }

    return result;
  }

  async updateEvent(
    id: string,
    uid: string,
    updateEventDto: UpdateEventDto,
    img?: Express.Multer.File,
  ) {
    const event = await this.eventRepository.findEventById(id);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Sprawdź czy użytkownik jest BOSS'em miejsca
    const isUserBoss = await this.employeeService.isUserBossOfPlace(
      uid,
      event.place._id.toString(),
    );
    if (!isUserBoss) {
      throw new UnauthorizedException('ILLEGAL_OPERATION');
    }

    // Walidacja dat
    const { startDate, endDate, locationIds, shouldUpdateImg } = updateEventDto;
    if (
      startDate &&
      endDate &&
      isBefore(new Date(endDate), new Date(startDate))
    ) {
      throw new BadRequestException(
        'Event should not end before it has started',
      );
    }

    const updateData: any = { ...updateEventDto };
    delete updateData.shouldUpdateImg; // Nie zapisujemy tego pola w bazie

    // Jeśli są nowe locationIds, weryfikujemy czy istnieją
    if (locationIds && locationIds.length > 0) {
      const places = await Promise.all(
        locationIds.map((locationId) =>
          this.placeService.findByLocationId(locationId),
        ),
      );

      const notFoundLocationIds = locationIds.filter(
        (_id, index) => !places[index],
      );
      if (notFoundLocationIds.length > 0) {
        throw new NotFoundException(
          `Locations with ids: ${notFoundLocationIds.join(', ')} not found`,
        );
      }

      // Aktualizujemy place na pierwszy z nowych locationIds
      updateData.place = places[0]._id;
    }

    // Obsługa nowego obrazka - tylko jeśli shouldUpdateImg jest true
    let oldImageId: string | undefined;
    if (shouldUpdateImg && img) {
      // Zapisz stary imageId do usunięcia
      oldImageId = event.img?.replace(`${process.env.CLOUDI_URL}/`, '');

      // Upload nowego obrazka
      const newImageId = await this.cloudinaryService.uploadImage(
        img,
        'events',
      );
      updateData.img = newImageId;
    }

    // Aktualizuj event
    const updatedEvent = await this.eventRepository.updateEvent(id, updateData);

    // Usuń stary obrazek z Cloudinary jeśli był nowy upload
    if (oldImageId && shouldUpdateImg && img) {
      try {
        await this.cloudinaryService.destroyImage(oldImageId);
      } catch (error) {
        // Logujemy błąd, ale nie przerywamy operacji
        console.error('Failed to delete old image from Cloudinary:', error);
      }
    }

    return updatedEvent;
  }
}
