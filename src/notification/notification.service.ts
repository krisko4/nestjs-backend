import { ClientSession } from 'mongoose';
import { FirebaseService } from './../firebase/firebase.service';
import { NotificationUpdateQuery } from './queries/notification-update.query';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationRepository } from './notification.repository';
import { NotificationFilterQuery } from './queries/notification-filter.query';
import { UserService } from 'src/user/user.service';
import _ from 'lodash/fp';
import { MessagingPayload } from 'firebase-admin/lib/messaging/messaging-api';
import { differenceInSeconds } from 'date-fns';
import { getNotificationMessage } from './notification-messages';
import { NotificationType } from './schemas/notification.schema';

@Injectable()
export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly firebaseService: FirebaseService,
    private readonly userService: UserService,
  ) {}

  async hasUserAlreadyReceivedNearbyEventsNotification(
    userId: string,
    date: Date,
  ) {
    return this.notificationRepository.hasUserAlreadyReceivedNearbyEventsNotification(
      userId,
      date,
    );
  }

  async sendNotification(receivers: string[], payload: MessagingPayload) {
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
    if (tokens.length > 0) {
      return this.firebaseService.sendToDevice(tokens, payload);
    }
  }

  async createAndSendPersonalizedNotifications(
    notificationType: NotificationType,
    receiverIds: string[],
    variables: Record<string, string> = {},
    data: Record<string, string> = {},
    notificationData: {
      locationId: string;
      eventId?: string;
      rewardId?: string;
    },
    session?: ClientSession,
  ) {
    const createNotificationDto = {
      locationId: notificationData.locationId,
      receivers: receiverIds,
      type: notificationType,
      ...(notificationData.eventId && { eventId: notificationData.eventId }),
      ...(notificationData.rewardId && { rewardId: notificationData.rewardId }),
    };

    const notification = await this.create(createNotificationDto, session);

    const usersByLanguage: Map<string, { userId: string; tokens: string[] }[]> =
      new Map();

    for (const receiverId of receiverIds) {
      const user = await this.userService.findById(receiverId);
      if (!user) {
        console.warn(`User with id: ${receiverId} not found`);
        continue;
      }

      const language = user.userLanguage || 'en';

      if (!usersByLanguage.has(language)) {
        usersByLanguage.set(language, []);
      }

      usersByLanguage.get(language).push({
        userId: receiverId,
        tokens: user.notificationTokens,
      });
    }

    const results = [];
    for (const [language, users] of usersByLanguage.entries()) {
      const message = getNotificationMessage(
        notificationType,
        language,
        variables,
      );

      const tokens: string[] = [];
      users.forEach((user) => {
        user.tokens.forEach((token) => {
          if (!tokens.includes(token)) {
            tokens.push(token);
          }
        });
      });

      if (tokens.length > 0) {
        const payload: MessagingPayload = {
          notification: {
            title: message.title,
            body: message.body,
          },
          data: {
            ...data,
            _id: notification._id.toString(),
          },
        };

        const result = await this.firebaseService.sendToDevice(tokens, payload);
        results.push({ language, sendResult: result });
      }
    }

    return { notification, results };
  }

  async create(
    createNotificationDto: CreateNotificationDto,
    session?: ClientSession,
  ) {
    return this.notificationRepository.createNotification(
      createNotificationDto,
      session,
    );
  }

  findById(id: string) {
    return this.notificationRepository.findById(id);
  }

  findByEventId(eventId: string) {
    return this.notificationRepository.findByEventsIds([eventId]);
  }

  findByQuery(filterQuery: NotificationFilterQuery, userId: string) {
    const { locationId, eventId, eventsIds } = filterQuery;
    const queryLength = Object.keys(filterQuery).length;
    if (queryLength > 1)
      throw new BadRequestException('Only one query parameter can be provided');
    if (locationId) {
      return this.notificationRepository.findByLocationId(locationId);
    }
    if (eventId) {
      // return this.findByEventId(eventId);
      return this.findNotificationStatistics([eventId]);
    }
    if (eventsIds) {
      // return this.findByEventId(eventId);
      return this.findNotificationStatistics(eventsIds);
    }
    return this.notificationRepository.findByReceiverId(userId);
  }

  async findNotificationStatistics(eventsIds: string[]) {
    const notifications = await this.notificationRepository.findByEventsIds(
      eventsIds,
    );
    return notifications.map((notification) => {
      let receivedCount = 0;
      let clickedCount = 0;
      let clickTime = 0;
      for (const receiver of notification.receivers) {
        if (receiver.received) {
          receivedCount++;
        }
        if (receiver.clicked) {
          clickedCount++;
        }
        if (receiver.clickedAt) {
          clickTime += differenceInSeconds(
            new Date(receiver.clickedAt),
            new Date(receiver.receivedAt),
          );
        }
      }
      return {
        type: notification.type,
        all: notification.receivers.length,
        received: receivedCount,
        clicked: clickedCount,
        averageClickTime: Math.floor(clickTime / clickedCount) || 0,
        eventName: notification.event ? notification.event.title : undefined,
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
