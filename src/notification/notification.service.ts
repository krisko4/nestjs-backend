import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { NotificationRepository } from './notification.repository';
import { NotificationFilterQuery } from './queries/notification-filter.query';

@Injectable()
export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
  ) {}
  create(createNotificationDto: CreateNotificationDto) {
    return this.notificationRepository.createNotification(
      createNotificationDto,
    );
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
