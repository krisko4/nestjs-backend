import { JwtAuthGuard } from './../auth/jwt-auth.guard';
import { NotificationUpdateQuery } from './queries/notification-update.query';
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Patch,
  Param,
  UseGuards,
  Req,
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

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.notificationService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findByQuery(@Req() req, @Query() filterQuery: NotificationFilterQuery) {
    const { user } = req;
    return this.notificationService.findByQuery(filterQuery, user.uid);
  }

  @Patch(':id')
  update(
    @Param() id: string,
    @Query() notificationUpdateQuery: NotificationUpdateQuery,
  ) {
    return this.notificationService.update(id, notificationUpdateQuery);
  }
}
