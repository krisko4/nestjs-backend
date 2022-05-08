import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { VisitService } from './visit.service';
import { CreateVisitDto } from './dto/create-visit.dto';
import { FindVisitsQuery } from './queries/find-visits.query';

@Controller('visits')
export class VisitController {
  constructor(private readonly visitService: VisitService) {}

  @Post()
  create(@Body() createVisitDto: CreateVisitDto) {
    return this.visitService.create(createVisitDto);
  }

  @Get('/search')
  findByQuery(@Query() findVisitsQuery: FindVisitsQuery) {
    return this.visitService.findByQuery(findVisitsQuery);
  }

  @Get()
  findAll() {
    return this.visitService.findAll();
  }
}
