import { NotificationType } from 'src/notification/schemas/notification.schema';
import { startOfDay, endOfDay } from 'date-fns';
import { Place } from './../place/schemas/place.schema';
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
  async findByReceiverId(receiverId: string) {
    const notifications = await this.notificationModel
      .aggregate()
      .match({ 'receivers.receiver': new Types.ObjectId(receiverId) })
      .lookup({
        from: 'places',
        localField: 'locationId',
        foreignField: 'locations._id',
        as: 'place',
      })
      .lookup({
        from: 'events',
        localField: 'event',
        foreignField: '_id',
        as: 'event',
      })
      .unwind('event')
      .unwind('place')
      .project({
        _id: 1,
        title: 1,
        date: 1,
        event: 1,
        placeLogo: { $concat: [process.env.CLOUDI_URL, '/', '$place.logo'] },
      });
    return notifications;
  }
  findById(id: string) {
    return this.notificationModel.findById(new Types.ObjectId(id)).exec();
  }
  hasUserAlreadyReceivedNearbyNotification(userId: string, date: Date) {
    return this.findOne({
      'receivers.receiver': userId,
      'receivers.received': true,
      date: { $gte: startOfDay(date), $lt: endOfDay(date) },
      type: NotificationType.EVENT_TODAY_NEARBY,
    });
  }
  findByEventId(eventId: string) {
    const id = new Types.ObjectId(eventId);
    return this.find({ $or: [{ event: id }, { events: id }] });
  }
  createNotification(createNotificationDto: CreateNotificationDto) {
    const { receivers, eventId, eventIds, title, type, locationId } =
      createNotificationDto;
    const mappedReceivers = receivers.map((receiverId) => ({
      receiver: new Types.ObjectId(receiverId),
    }));
    return this.create({
      event: eventId && new Types.ObjectId(eventId),
      events: eventIds && eventIds.map((id) => new Types.ObjectId(id)),
      title,
      locationId,
      receivers: mappedReceivers,
      type,
    });
  }

  updateNotificationState(
    id: string,
    receiverId: string,
    state: 'clicked' | 'received',
  ) {
    const updateObj = {};
    updateObj[`receivers.$.${state}`] = true;
    return this.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        'receivers.receiver': new Types.ObjectId(receiverId),
      },
      {
        $set: updateObj,
      },
    );
  }
}
