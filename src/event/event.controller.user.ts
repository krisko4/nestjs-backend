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
import { PaginationQuery } from 'src/place/queries/pagination.query';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { SearchEventQuery } from './queries/search-event.query';
import { plainToInstance } from 'class-transformer';
import { Event } from './schemas/event.schema';
import { UserEventsQuery } from './queries/user-events.query';

@Controller('user/events')
export class UserEventController {
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

  @Get('/search')
  async search(@Query() searchEventQuery: SearchEventQuery) {
    const events = await this.eventService.search(searchEventQuery);
    console.log(events);
    return events;
  }

  @UseGuards(JwtAuthGuard)
  @Get('/my-events')
  async findUserEvents(@Query() userEventsQuery: UserEventsQuery, @Req() req) {
    const { uid } = req.user;
    return this.eventService.findUserEvents(userEventsQuery, uid);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findById(@Param('id') id: string, @Req() req) {
    const { uid } = req.user;
    const event = await this.eventService.findById(id, uid);
    return plainToInstance(Event, event);
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
    return this.eventService.updateParticipator(
      id,
      participatorId,
      uid,
      updateParticipatorDto,
    );
  }
}
