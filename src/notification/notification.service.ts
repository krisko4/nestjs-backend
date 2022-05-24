import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { NotificationRepository } from './notification.repository';
import { NotificationFilterQuery } from './queries/notification-filter.query';
import * as firebase from 'firebase-admin';
import { UserService } from 'src/user/user.service';
import { format } from 'date-fns';
import { PlaceService } from 'src/place/place.service';
import { EventService } from 'src/event/event.service';

@Injectable()
export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly userService: UserService,
    private readonly placeService: PlaceService,
    @Inject(forwardRef(() => EventService))
    private readonly eventService: EventService,
  ) {
    firebase.initializeApp({
      credential: firebase.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
  }

  async create(createNotificationDto: CreateNotificationDto) {
    const { receivers, title, locationId, eventId } = createNotificationDto;
    const tokens: string[] = [];
    for (const receiverId of receivers) {
      const user = await this.userService.findById(receiverId);
      if (!user)
        throw new InternalServerErrorException(
          `User with id: ${receiverId} not found`,
        );
      tokens.push(user.notificationToken);
    }
    const notification = await this.notificationRepository.createNotification(
      createNotificationDto,
    );
    const place = await this.placeService.findByLocationId(locationId);
    const { event } = await this.eventService.findById(eventId);
    const { startDate, endDate, img } = event;
    await firebase.messaging().sendToDevice(
      tokens,
      {
        data: {
          title,
          startDate: format(startDate, 'yyyy-MM-dd hh:mm'),
          endDate: format(endDate, 'yyyy-MM-dd hh:mm'),
          eventId,
          locationName: place.name,
          img: `${process.env.CLOUDI_URL}/${img}`,
        },
      },
      {
        contentAvailable: true,
      },
    );
    return notification;
  }

  findByQuery(filterQuery: NotificationFilterQuery) {
    const { locationId, receiverId } = filterQuery;
    if (locationId && receiverId)
      throw new BadRequestException('Only one query parameter can be provided');
    if (locationId) {
      return this.notificationRepository.findByLocationId(locationId);
    }
    return this.notificationRepository.findByReceiverId(receiverId);
  }
}
