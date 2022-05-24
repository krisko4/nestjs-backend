import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  Req,
  UseInterceptors,
  UploadedFiles,
  UseGuards,
  Put,
} from '@nestjs/common';
import { PlaceService } from './place.service';
import { CreatePlaceDto } from './dto/create-place.dto';
import { PlaceFilterQuery } from './queries/place.filter.query';
import { FindLocationParams } from './params/find.location.params';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { plainToInstance } from 'class-transformer';
import { Place } from './schemas/place.schema';
import { UpdatePlaceDto } from './dto/update-place.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import {
  LocationIdsDto,
  UpdateOpeningHoursDto,
} from './dto/update-opening-hours.dto';
import { PlaceDto } from './dto/place.dto';
import { CoordsQuery } from './queries/coords.query';

@Controller('places')
export class PlaceController {
  constructor(private readonly placeService: PlaceService) {}

  @Put()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'logo', maxCount: 1 },
      { name: 'images', maxCount: 4 },
    ]),
  )
  @UseGuards(JwtAuthGuard)
  update(
    @Body() updatePlaceDto: UpdatePlaceDto,
    @Req() req,
    @UploadedFiles()
    files: { logo?: Express.Multer.File[]; images?: Express.Multer.File[] },
  ) {
    const { uid } = req.cookies;
    return this.placeService.update(
      updatePlaceDto,
      uid,
      files.logo,
      files.images,
    );
  }
  @Post()
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'logo', maxCount: 1 },
      { name: 'images', maxCount: 4 },
    ]),
  )
  @UseGuards(JwtAuthGuard)
  create(
    @Body() createPlaceDto: CreatePlaceDto,
    @Req() req,
    @UploadedFiles()
    files: { logo?: Express.Multer.File[]; images?: Express.Multer.File[] },
  ) {
    const { uid } = req.cookies;
    return this.placeService.create(
      createPlaceDto,
      files.logo,
      files.images,
      uid,
    );
  }

  @Get()
  findAll() {
    return this.placeService.findAll();
  }

  @Patch(':locationId/status')
  setStatus(
    @Param('locationId') locationId: string,
    @Body() updateStatusDto: UpdateStatusDto,
  ) {
    return this.placeService.setStatus(locationId, updateStatusDto);
  }

  @Get('/search')
  async findByUserId(@Query('uid') uid: string) {
    const places = await this.placeService.findByUserId(uid);
    return places.map((place) => {
      const placeDto = plainToInstance(PlaceDto, place.toObject());
      placeDto.isUserOwner = true;
      return placeDto;
    });
  }

  @Get('/active')
  async findActive(@Req() req) {
    const { uid } = req.cookies;
    const places = await this.placeService.findActive();
    return places.map((place) => {
      const placeDto = plainToInstance(PlaceDto, place.toObject());
      placeDto.isUserOwner = place.userId === uid;
      return placeDto;
    });
  }

  @Get('/by-coords')
  async findByLatLng(@Query() coordsQuery: CoordsQuery) {
    const { lat, lng } = coordsQuery;
    return this.placeService.findByLatLng(lat, lng);
  }

  @Get('/popular')
  async findPopular(@Query() placeFilterQuery: PlaceFilterQuery) {
    return this.placeService.findPopular(placeFilterQuery);
  }

  @Get('/recent')
  async findRecentlyAdded(@Query() placeFilterQuery: PlaceFilterQuery) {
    return this.placeService.findRecentlyAdded(placeFilterQuery);
  }

  @Get('/top')
  async findTopRated(@Query() placeFilterQuery: PlaceFilterQuery) {
    return this.placeService.findTopRated(placeFilterQuery);
  }

  @Get('/subscribed')
  async findSubscribed(
    @Req() req,
    @Query() placeFilterQuery: PlaceFilterQuery,
  ) {
    const { uid } = req.cookies;
    return this.placeService.findSubscribed(placeFilterQuery, uid);
  }

  @Get('/favorite')
  async findFavorite(
    @Query() placeFilterQuery: PlaceFilterQuery,
    @Req() request,
  ) {
    const { favIds } = request.cookies;
    return this.placeService.findFavorite(placeFilterQuery, favIds);
  }
  @Get(':locationId/opening-hours')
  findOpeningHours(@Param('locationId') locationId: string) {
    return this.placeService.findOpeningHours(locationId);
  }

  @Patch(':id/opening-hours')
  setOpeningHours(
    @Req() req,
    @Param('id') id: string,
    @Body() updateOpeningHoursDto: UpdateOpeningHoursDto,
  ) {
    const { uid } = req.cookies;
    return this.placeService.setOpeningHours(id, uid, updateOpeningHoursDto);
  }

  @Patch(':id/always-open')
  setAlwaysOpen(
    @Req() req,
    @Param('id') id: string,
    @Body() locationIdsDto: LocationIdsDto,
  ) {
    const { uid } = req.cookies;
    return this.placeService.setAlwaysOpen(id, uid, locationIdsDto);
  }

  @Get(':locationId/status')
  findStatus(@Param('locationId') locationId: string): Promise<string> {
    return this.placeService.findStatus(locationId);
  }

  @Get(':locationId/average-note')
  findAverageNote(@Param('locationId') locationId: string) {
    return this.placeService.findAverageNote(locationId);
  }

  @Get(':id/locations/:locationId')
  async findLocation(
    @Req() req,
    @Param() { locationId, id }: FindLocationParams,
  ) {
    const { uid } = req.cookies;
    const place = await this.placeService.findLocation(id, locationId);
    const placeDto = plainToInstance(PlaceDto, place);
    placeDto.isUserOwner = place.userId.toString() === uid.toString();
    return placeDto;
  }

  @Patch(':id/visit-count')
  incrementVisitCount(@Param('id') id: string) {
    return this.placeService.incrementVisitCount(id);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const place = await this.placeService.findById(id);
    return plainToInstance(PlaceDto, place.toObject());
  }
}
