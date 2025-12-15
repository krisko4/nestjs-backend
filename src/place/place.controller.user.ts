import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PlaceService } from './place.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { SearchPlaceQuery } from './queries/search-place.query';
import { FindLocationParams } from './params/find.location.params';
import { plainToInstance } from 'class-transformer';
import { PlaceDto } from './dto/place.dto';
import { PlaceFilterQuery } from './queries/place.filter.query';

@Controller('user/places')
export class UserPlaceController {
  constructor(private readonly placeService: PlaceService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async findPlacesByUserId(@Req() req) {
    const { uid } = req.user;
    console.log(uid);
    const data = await this.placeService.getPlacesByUserId(uid);
    return data.map((record) => ({
      ...record,
      place: plainToInstance(PlaceDto, record.place),
    }));
  }

  @UseGuards(JwtAuthGuard)
  @Get('/search')
  search(@Query() searchQuery: SearchPlaceQuery, @Req() req) {
    const { uid } = req.user;
    return this.placeService.search(searchQuery, uid);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/favorites')
  async getFavoriteLocations(
    @Query() placeFilterQuery: PlaceFilterQuery,
    @Req() req,
  ) {
    const { uid } = req.user;
    return this.placeService.getFavoriteLocations(placeFilterQuery, uid);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/locations/:locationId')
  async findLocation(
    @Param() { locationId, id }: FindLocationParams,
    @Req() req,
  ) {
    const { uid } = req.user;
    const place = await this.placeService.findLocation(id, locationId, uid);
    const placeDto = plainToInstance(PlaceDto, place);
    return placeDto;
  }

  @UseGuards(JwtAuthGuard)
  @Post('locations/:locationId/code')
  async generateLocationCode(
    @Param('locationId') locationId: string,
    @Req() req,
  ) {
    const { uid } = req.user;
    return this.placeService.generateLocationCode(locationId, uid);
  }
}
