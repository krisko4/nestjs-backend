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
import {
  NotificationDocument,
  NotificationType,
} from './schemas/notification.schema';

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

  async sendRewardNotifications(
    createNotificationDto: CreateNotificationDto,
    notification: NotificationDocument,
    tokens: string[],
  ) {
    const { title, body } = createNotificationDto;
    return firebase.messaging().sendToDevice(
      tokens,
      {
        data: {
          _id: notification._id.toString(),
        },
        notification: {
          title,
          body,
        },
      },
      {
        contentAvailable: true,
      },
    );
  }

  async sendNearbyEventsNotifications(
    createNotificationDto: CreateNotificationDto,
    notification: NotificationDocument,
    tokens: string[],
  ) {
    const { title, body } = createNotificationDto;
    return firebase.messaging().sendToDevice(
      tokens,
      {
        data: {
          _id: notification._id.toString(),
        },
        notification: {
          title,
          body,
        },
      },
      {
        contentAvailable: true,
      },
    );
  }

  async sendReminderNotifications(
    createNotificationDto: CreateNotificationDto,
    notification: NotificationDocument,
    tokens: string[],
  ) {
    const { title, body } = createNotificationDto;
    return firebase.messaging().sendToDevice(
      tokens,
      {
        data: {
          _id: notification._id.toString(),
        },
        notification: {
          title,
          body,
        },
      },
      {
        contentAvailable: true,
      },
    );
  }

  async sendEventNotifications(
    createNotificationDto: CreateNotificationDto,
    notification: NotificationDocument,
    tokens: string[],
  ) {
    const { title, body, locationId, eventId } = createNotificationDto;
    const place = await this.placeService.findByLocationId(locationId);
    const { event } = await this.eventService.findById(eventId);
    const { startDate, endDate, img } = event;
    return firebase.messaging().sendToDevice(
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
  }

  async hasUserAlreadyReceivedNearbyNotification(userId: string, date: Date) {
    return this.notificationRepository.hasUserAlreadyReceivedNearbyNotification(
      userId,
      date,
    );
  }

  async create(createNotificationDto: CreateNotificationDto) {
    const { receivers, type } = createNotificationDto;
    const tokens: string[] = [];
    for (const receiverId of receivers) {
      const user = await this.userService.findById(receiverId);
      if (!user)
        throw new InternalServerErrorException(
          `User with id: ${receiverId} not found`,
        );
      user.notificationTokens.forEach((token) => {
        if (!tokens.includes(token)) {
          tokens.push(token);
        }
      });
    }
    if (tokens.length === 0) {
      throw new InternalServerErrorException('No receiver tokens found');
    }
    const notification = await this.notificationRepository.createNotification(
      createNotificationDto,
    );
    if (type === NotificationType.NEW_EVENT) {
      await this.sendEventNotifications(
        createNotificationDto,
        notification,
        tokens,
      );
    }
    if (type === NotificationType.REWARD) {
      await this.sendRewardNotifications(
        createNotificationDto,
        notification,
        tokens,
      );
    }
    if (type === NotificationType.REMINDER) {
      await this.sendReminderNotifications(
        createNotificationDto,
        notification,
        tokens,
      );
    }
    if (type === NotificationType.EVENT_TODAY_NEARBY) {
      await this.sendNearbyEventsNotifications(
        createNotificationDto,
        notification,
        tokens,
      );
    }
    return notification;
  }

  findById(id: string) {
    return this.notificationRepository.findById(id);
  }

  findByQuery(filterQuery: NotificationFilterQuery, userId: string) {
    const { locationId, eventId } = filterQuery;
    const queryLength = Object.keys(filterQuery).length;
    if (queryLength > 1)
      throw new BadRequestException('Only one query parameter can be provided');
    if (locationId) {
      return this.notificationRepository.findByLocationId(locationId);
    }
    if (eventId) {
      return this.findNotificationStatistics(eventId);
    }
    return this.notificationRepository.findByReceiverId(userId);
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
