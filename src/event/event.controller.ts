import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  Query,
  UploadedFile,
} from '@nestjs/common';
import { EventService } from './event.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { EventFilterQuery } from './queries/event-filter.query';
import { plainToInstance } from 'class-transformer';
import { EventDto } from './dto/event.dto';
import { PaginationQuery } from 'src/place/queries/pagination.query';

@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @UseInterceptors(FileInterceptor('img'))
  @Post()
  create(
    @Body() createEventDto: CreateEventDto,
    @UploadedFile() img: Express.Multer.File,
  ) {
    return this.eventService.create(createEventDto, img);
  }

  @Get()
  async find(@Query() eventFilterQuery: EventFilterQuery) {
    const events = await this.eventService.findByQuery(eventFilterQuery);
    return events.map((event) => plainToInstance(EventDto, event.toObject()));
  }

  @Get('/popular')
  async findPopular(@Query() paginationQuery: PaginationQuery) {
    return this.eventService.findPopular(paginationQuery);
  }
  @Get('/today')
  async findToday(@Query() paginationQuery: PaginationQuery) {
    const events = await this.eventService.findToday(paginationQuery);
    const { metadata, data } = events;
    if (data.length > 0) {
      return {
        metadata,
        data: data.map((event) => plainToInstance(EventDto, event)),
      };
    }
    return events;
  }
}
