import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationFilterQuery } from './queries/notification-filter.query';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationService.create(createNotificationDto);
  }

  @Get()
  findByQuery(@Query() filterQuery: NotificationFilterQuery) {
    return this.notificationService.findByQuery(filterQuery);
  }
}
