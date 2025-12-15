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
  Delete,
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

@Controller('admin/places')
export class AdminPlaceController {
  constructor(private readonly placeService: PlaceService) {}

  @Put(':id')
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
    @Param('id') id: string,
    @UploadedFiles()
    files: { logo?: Express.Multer.File[]; images?: Express.Multer.File[] },
  ) {
    const { uid } = req.user;
    return this.placeService.update(id, updatePlaceDto, uid, files.logo);
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
    return this.placeService.create(
      createPlaceDto,
      files.logo,
      files.images,
      req.user.uid,
    );
  }

  @Patch(':locationId/status')
  setStatus(
    @Param('locationId') locationId: string,
    @Body() updateStatusDto: UpdateStatusDto,
  ) {
    return this.placeService.setStatus(locationId, updateStatusDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findByUserId(@Req() req) {
    const { uid } = req.user;
    const places = await this.placeService.findByUserId(uid);
    return places.map((place) => {
      const placeDto = plainToInstance(PlaceDto, place.toObject());
      placeDto.isUserOwner = true;
      return placeDto;
    });
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
    const { uid } = req.user;
    const place = await this.placeService.findLocation(id, locationId, uid);
    const placeDto = plainToInstance(PlaceDto, place);
    placeDto.isUserOwner = place.userId.toString() === uid.toString();
    return placeDto;
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const place = await this.placeService.findById(id);
    return plainToInstance(PlaceDto, place.toObject());
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async removePlace(@Param('id') id: string) {
    return this.placeService.removePlace(id);
  }
}
