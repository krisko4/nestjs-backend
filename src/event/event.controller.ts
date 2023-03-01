import { StatisticsFilterQuery } from './queries/statistics-filter.query';
import { UpdateParticipatorDto } from './dto/update-participator.dto';
import { MarkParticipationIRLParams } from './params/mark-participation-irl.params';
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
  Req,
  UseGuards,
} from '@nestjs/common';
import { EventService } from './event.service';
import { CreateEventDto } from './dto/create-event.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { EventFilterQuery } from './queries/event-filter.query';
import { plainToInstance } from 'class-transformer';
import { EventDto } from './dto/event.dto';
import { PaginationQuery } from 'src/place/queries/pagination.query';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @UseGuards(JwtAuthGuard)
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
    return events.map((event) => plainToInstance(EventDto, event));
  }

  @UseGuards(JwtAuthGuard)
  @Get('statistics')
  async findStatistics(@Query() statisticsFilterQuery: StatisticsFilterQuery) {
    return this.eventService.findStatistics(statisticsFilterQuery);
  }

  @Get(':id')
  async findById(@Param('id') id: string, @Req() req) {
    const { uid } = req.cookies;
    const { event, isUserOwner } = await this.eventService.findById(id, uid);

    return {
      ...plainToInstance(EventDto, event),
      isUserOwner,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/participators')
  async addParticipator(@Param('id') id: string, @Req() req) {
    const { uid } = req.user;
    return this.eventService.addParticipator(id, uid);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/participators')
  async removeParticipator(@Param('id') id: string, @Req() req) {
    const { uid } = req.user;
    return this.eventService.removeParticipator(id, uid);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/participators/:participatorId')
  async updateParticipator(
    @Param() markParticipationIRLParams: MarkParticipationIRLParams,
    @Req() req,
    @Body() updateParticipatorDto?: UpdateParticipatorDto,
  ) {
    const { uid } = req.user;
    const { id, participatorId } = markParticipationIRLParams;
    console.log('hej');
    return this.eventService.updateParticipator(
      id,
      participatorId,
      uid,
      updateParticipatorDto,
    );
  }

  @Get('/search/popular')
  async findPopular(@Query() paginationQuery: PaginationQuery) {
    const events = await this.eventService.findPopular(paginationQuery);
    const { metadata, data } = events;
    if (data.length > 0) {
      return {
        metadata,
        data: data.map((event) => plainToInstance(EventDto, event)),
      };
    }
    return events;
  }
  @Get('/search/today')
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
