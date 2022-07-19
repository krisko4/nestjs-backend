import { NotificationUpdateQuery } from './queries/notification-update.query';
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
import _ from 'lodash/fp';

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
    const { receivers, title, body, locationId, eventId } =
      createNotificationDto;
    let tokens: string[] = [];
    for (const receiverId of receivers) {
      const user = await this.userService.findById(receiverId);
      if (!user)
        throw new InternalServerErrorException(
          `User with id: ${receiverId} not found`,
        );
      tokens = tokens.concat(user.notificationTokens);
    }
    if (tokens.length === 0)
      throw new InternalServerErrorException('No receiver tokens found');
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
          _id: notification._id.toString(),
          title,
          body,
          startDate: format(startDate, 'yyyy-MM-dd hh:mm'),
          endDate: format(endDate, 'yyyy-MM-dd hh:mm'),
          eventId,
          locationName: place.name,
          img: `${process.env.CLOUDI_URL}/${img}`,
        },
        notification: {
          title,
          body,
          imageUrl: `${process.env.CLOUDI_URL}/${img}`,
        },
      },
      {
        contentAvailable: true,
      },
    );
    return notification;
  }

  findByQuery(filterQuery: NotificationFilterQuery) {
    const { locationId, receiverId, eventId } = filterQuery;
    if (Object.keys(filterQuery).length > 1)
      throw new BadRequestException('Only one query parameter can be provided');
    if (locationId) {
      return this.notificationRepository.findByLocationId(locationId);
    }
    if (eventId) {
      return this.findNotificationStatistics(eventId);
    }
    return this.notificationRepository.findByReceiverId(receiverId);
  }

  async findNotificationStatistics(eventId: string) {
    const notifications = await this.notificationRepository.findByEventId(
      eventId,
    );
    console.log(notifications);
    return notifications.map((notification) => {
      let receivedCount = 0;
      let clickedCount = 0;
      for (const receiver of notification.receivers) {
        if (receiver.received) {
          receivedCount++;
        }
        if (receiver.clicked) {
          clickedCount++;
        }
      }
      return {
        type: notification.type,
        all: notification.receivers.length,
        received: receivedCount,
        clicked: clickedCount,
      };
    });
  }

  update(id: string, notificationUpdateQuery: NotificationUpdateQuery) {
    const { clicked, receiverId } = notificationUpdateQuery;
    const state = clicked ? 'clicked' : 'received';
    return this.notificationRepository.updateNotificationState(
      id,
      receiverId,
      state,
    );
  }
}
