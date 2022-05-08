import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { OpinionService } from './opinion.service';
import { CreateOpinionDto } from './dto/create-opinion.dto';
import { FindOpinionsQuery } from './queries/find-opinions.query';

@Controller('opinions')
export class OpinionController {
  constructor(private readonly opinionService: OpinionService) {}

  @Post()
  create(@Body() createOpinionDto: CreateOpinionDto) {
    return this.opinionService.create(createOpinionDto);
  }

  @Get('/search')
  findByQuery(@Query() findOpinionsQuery: FindOpinionsQuery) {
    return this.opinionService.findByQuery(findOpinionsQuery);
  }
}
