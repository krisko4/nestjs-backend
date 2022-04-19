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
import { PlaceService } from './place.service';
import { CreatePlaceDto } from './dto/create-place.dto';
import { UpdatePlaceDto } from './dto/update-place.dto';
import { PlaceFilterQuery } from './query/place.filter.query';

@Controller('places')
export class PlaceController {
  constructor(private readonly placeService: PlaceService) {}

  @Post()
  create(@Body() createPlaceDto: CreatePlaceDto) {
    return this.placeService.create(createPlaceDto);
  }

  @Get()
  findAll() {
    return this.placeService.findAll();
  }
  
  @Get('/active')
  findActive() {
    return this.placeService.findActive();
  }

  @Get()
  findPopular(@Query() placeFilterQuery: PlaceFilterQuery ) {
    return this.placeService.findPopular(placeFilterQuery);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.placeService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePlaceDto: UpdatePlaceDto) {
    return this.placeService.update(+id, updatePlaceDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.placeService.remove(+id);
  }
}
