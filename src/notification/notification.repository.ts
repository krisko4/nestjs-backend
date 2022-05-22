import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { MongoRepository } from '../database/repository';
import {
  Notification,
  NotificationDocument,
} from './schemas/notification.schema';
import { NotificationFilterQuery } from './queries/notification-filter.query';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationRepository extends MongoRepository<NotificationDocument> {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {
    super(notificationModel);
  }
  findByLocationId(locationId: string) {
    return this.find({ locationId: new Types.ObjectId(locationId) });
  }
  findByReceiverId(receiverId: string) {
    return this.find({ receivers: new Types.ObjectId(receiverId) });
  }
  createNotification(createNotificationDto: CreateNotificationDto) {
    const { receivers, eventId, title, locationId } = createNotificationDto;
    const mappedReceivers = receivers.map(
      (receiverId) => new Types.ObjectId(receiverId),
    );
    return this.create({
      event: new Types.ObjectId(eventId),
      title,
      locationId,
      receivers: mappedReceivers,
    });
  }
}
