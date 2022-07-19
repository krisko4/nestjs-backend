import { NotificationUpdateQuery } from './queries/notification-update.query';
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Patch,
  Param,
} from '@nestjs/common';
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

  @Patch(':id')
  update(
    @Param() id: string,
    @Query() notificationUpdateQuery: NotificationUpdateQuery,
  ) {
    return this.notificationService.update(id, notificationUpdateQuery);
  }
}
