import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { VisitService } from './visit.service';
import { CreateVisitDto } from './dto/create-visit.dto';

@Controller('visits')
export class VisitController {
  constructor(private readonly visitService: VisitService) {}

  @Post()
  create(@Body() createVisitDto: CreateVisitDto) {
    return this.visitService.create(createVisitDto);
  }
  @Get('/search')
  findByLocationId(@Query('locationId') locationId: string) {
    return this.visitService.findByLocationId(locationId);
  }

  @Get()
  findAll() {
    return this.visitService.findAll();
  }
}
