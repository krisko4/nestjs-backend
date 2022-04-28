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
} from '@nestjs/common';
import { PlaceService } from './place.service';
import { CreatePlaceDto } from './dto/create-place.dto';
import { PlaceFilterQuery } from './query/place.filter.query';
import { FindLocationParams } from './params/find.location.params';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('places')
export class PlaceController {
  constructor(private readonly placeService: PlaceService) {}

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'logo', maxCount: 1 },
        { name: 'images', maxCount: 4 },
      ],
      {
        dest: '/tmp/',
        limits: {
          fileSize: 2000000,
        },
        fileFilter: function (req, file, callback) {
          const mimetype = file.mimetype;
          if (!mimetype.startsWith('image/')) {
            return callback(new Error('Only images are allowed'), false);
          }
          callback(null, true);
        },
      },
    ),
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

  @Get('/search')
  findById(@Query('uid') uid: string) {
    return this.placeService.findByUserId(uid);
  }

  @Get('/active')
  findActive() {
    return this.placeService.findActive();
  }

  @Get('/popular')
  findPopular(@Query() placeFilterQuery: PlaceFilterQuery) {
    return this.placeService.findPopular(placeFilterQuery);
  }

  @Get('/recent')
  findRecentlyAdded(@Query() placeFilterQuery: PlaceFilterQuery) {
    return this.placeService.findRecentlyAdded(placeFilterQuery);
  }

  @Get('/top')
  findTopRated(@Query() placeFilterQuery: PlaceFilterQuery) {
    return this.placeService.findTopRated(placeFilterQuery);
  }

  @Get('/favorite')
  findFavorite(@Query() placeFilterQuery: PlaceFilterQuery, @Req() request) {
    const { favIds } = request.cookies;
    return this.placeService.findFavorite(placeFilterQuery, favIds);
  }

  @Get(':id/locations/:locationId')
  findLocation(@Param() { locationId, id }: FindLocationParams) {
    return this.placeService.findLocation(id, locationId);
  }

  @Patch(':id/visit-count')
  incrementVisitCount(@Param('id') id: string) {
    return this.placeService.incrementVisitCount(id);
  }
}
