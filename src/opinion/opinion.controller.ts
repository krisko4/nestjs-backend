import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { OpinionService } from './opinion.service';
import { CreateOpinionDto } from './dto/create-opinion.dto';
import { UpdateOpinionDto } from './dto/update-opinion.dto';

@Controller('opinions')
export class OpinionController {
  constructor(private readonly opinionService: OpinionService) {}

  @Post()
  create(@Body() createOpinionDto: CreateOpinionDto) {
    return this.opinionService.create(createOpinionDto);
  }

  @Get()
  findAll() {
    return this.opinionService.findAll();
  }
  @Get('/search')
  findByLocationId(@Query('locationId') locationId: string) {
    return this.opinionService.findByLocationId(locationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.opinionService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOpinionDto: UpdateOpinionDto) {
    return this.opinionService.update(+id, updateOpinionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.opinionService.remove(+id);
  }
}
