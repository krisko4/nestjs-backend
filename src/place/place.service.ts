import { toMongoObjectId } from './../utils/mongo';
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { CreatePlaceDto } from './dto/create-place.dto';
import { PlaceRepository } from './place.repository';
import { PlaceFilterQuery } from './queries/place.filter.query';
import mongoose from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { PlaceDocument } from './schemas/place.schema';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { UpdateStatusDto } from './dto/update-status.dto';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { SubscriptionDocument } from 'src/subscription/schemas/subscription.schema';
import { SearchPlaceQuery } from './queries/search-place.query';
import { CodeService } from 'src/code/code.service';
import { PlaceEmployeeService } from 'src/place-employee/place-employee.service';
import {
  PlaceEmployeeRole,
  PlaceEmployeeStatus,
} from 'src/place-employee/schemas/place-employee.schema';
import { EmployeeService } from 'src/employee/employee.service';

@Injectable()
export class PlaceService {
  constructor(
    private readonly placeRepository: PlaceRepository,
    private readonly userService: UserService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly subscriptionService: SubscriptionService,
    @Inject(forwardRef(() => CodeService))
    private readonly codeService: CodeService,
    @Inject(forwardRef(() => PlaceEmployeeService))
    private readonly placeEmployeeService: PlaceEmployeeService,
    private readonly employeeService: EmployeeService,
    @InjectConnection() private readonly connection: mongoose.Connection,
  ) {}

  private async validateUser(uid: string) {
    const user = await this.userService.findById(uid);
    if (!user)
      throw new InternalServerErrorException(
        'User with provided uid not found',
      );
    return user;
  }

  // async update(
  //   updatePlaceDto: UpdatePlaceDto,
  //   uid: string,
  //   logo?: Express.Multer.File[],
  //   images?: Express.Multer.File[],
  // ) {
  //   const user = await this.validateUser(uid);
  //   const place = await this.findByLocationId(updatePlaceDto.locationId);
  //   if (!place) throw new InternalServerErrorException('Invalid locationId');
  //   if (!user._id.equals(place.userId))
  //     throw new InternalServerErrorException('Illegal operation');
  //   const { locations } = updatePlaceDto;
  //   for (const location of locations) {
  //     const { lat, lng } = location;
  //     const occupiedAddress = await this.findByLatLng(lat, lng);
  //     if (occupiedAddress)
  //       throw new InternalServerErrorException(
  //         `The address: ${occupiedAddress} is already occupied by another place`,
  //       );
  //   }
  //   const session = await this.connection.startSession();
  //   let updatedPlace: PlaceDocument;
  //   await session.withTransaction(async () => {
  //     let newLogoId: string;
  //     if (logo) {
  //       await this.cloudinaryService.destroyImage(place.logo);
  //       newLogoId = await this.cloudinaryService.uploadImage(
  //         logo[0],
  //         'place_logos',
  //       );
  //     }
  //     let newImages: string[];
  //     if (images) {
  //       await place.images.map((image) =>
  //         this.cloudinaryService.destroyImage(image),
  //       );
  //       for (const image of images) {
  //         const newImageId = await this.cloudinaryService.uploadImage(
  //           image,
  //           'place_images',
  //         );
  //         newImages.push(newImageId);
  //       }
  //     }
  //     updatedPlace = await this.placeRepository.updatePlace(
  //       updatePlaceDto,
  //       user._id,
  //       session,
  //       newImages,
  //       newLogoId,
  //     );
  //   });
  //   await session.endSession();
  //   return updatedPlace;
  // }
  async create(
    createPlaceDto: CreatePlaceDto,
    logo: Express.Multer.File[] | undefined,
    images: Express.Multer.File[],
    uid: string,
  ) {
    // const { locations } = createPlaceDto;
    const user = await this.validateUser(uid);
    if (logo && logo.length > 1)
      throw new BadRequestException('Exactly one logo file is required');
    // for (const location of locations) {
    //   const { lat, lng } = location;
    //   const occupiedAddress = await this.findByLatLng(lat, lng);
    //   if (occupiedAddress)
    //     throw new InternalServerErrorException(
    //       `The address: ${occupiedAddress} is already occupied by another place`,
    //     );
    // }
    const session = await this.connection.startSession();
    let registeredPlace: PlaceDocument;
    await session.withTransaction(async () => {
      let logoUrl: string | null = null;
      if (logo) {
        logoUrl = await this.cloudinaryService.uploadImage(
          logo[0],
          'place_logos',
        );
      }

      const imageUrls = [];
      if (images) {
        for (const image of images) {
          const imageId = await this.cloudinaryService.uploadImage(
            image,
            'place_images',
          );
          imageUrls.push(imageId);
        }
      }
      registeredPlace = await this.placeRepository.createPlace(
        imageUrls,
        logoUrl,
        createPlaceDto,
        user,
        session,
      );

      let employee = await this.employeeService.findByEmail(user.email);
      if (!employee) {
        employee = await this.employeeService.createEmployee(
          {
            user: user._id,
            email: user.email,
          },
          session,
        );
      }

      console.log(registeredPlace.locations);

      for (const location of registeredPlace.locations) {
        await this.placeEmployeeService.createPlaceEmployee(
          {
            place: registeredPlace._id,
            location: toMongoObjectId(location._id),
            employee: employee._id,
            role: PlaceEmployeeRole.BOSS,
            status: PlaceEmployeeStatus.ACTIVE,
          },
          session,
        );
      }
    });
    await session.endSession();
    return registeredPlace;
  }

  findById(id: string) {
    return this.placeRepository.findById(id);
  }

  findAll() {
    return this.placeRepository.find();
  }

  findByLatLng(lat: number, lng: number) {
    return this.placeRepository.findByLatLng(lat, lng);
  }

  findActive() {
    return this.placeRepository.findActive();
  }

  findByLocationId(locationId: string) {
    return this.placeRepository.findByLocationId(locationId);
  }

  findRecentlyAdded(placeFilterQuery: PlaceFilterQuery) {
    return this.placeRepository.findRecentlyAdded(placeFilterQuery);
  }

  findTopRated(placeFilterQuery: PlaceFilterQuery) {
    return this.placeRepository.findTopRated(placeFilterQuery);
  }

  async findSubscribed(placeFilterQuery: PlaceFilterQuery, uid: string) {
    const user = await this.validateUser(uid);
    const subscriptions = (await this.subscriptionService.find({
      userId: user._id,
    })) as SubscriptionDocument[];
    const subscribedLocationIds = subscriptions.map((sub) => sub.locationId);
    return this.placeRepository.findByLocationIds(
      placeFilterQuery,
      subscribedLocationIds,
    );
  }

  findFavorite(placeFilterQuery: PlaceFilterQuery, favIds: string[]) {
    if (!favIds) return [];
    return this.placeRepository.findByLocationIds(placeFilterQuery, favIds);
  }

  async findLocation(id: string, locationId: string, userId: string) {
    const favoriteLocationIds = await this.userService.getFavoriteLocationIds(
      userId,
    );
    return this.placeRepository.findLocation(
      id,
      locationId,
      favoriteLocationIds,
    );
  }

  findOpeningHours(locationId: string) {
    return this.placeRepository.findOpeningHours(locationId);
  }
  findAverageNote(locationId: string) {
    return this.placeRepository.findAverageNote(locationId);
  }

  findStatus(locationId: string) {
    return this.placeRepository.findStatus(locationId);
  }

  // async setOpeningHours(
  //   id: string,
  //   uid: string,
  //   updateOpeningHoursDto: UpdateOpeningHoursDto,
  // ) {
  //   const user = await this.validateUser(uid);
  //   const place = await this.findById(id);
  //   if (place.userId.toString() !== uid.toString())
  //     throw new InternalServerErrorException('Illegal operation');
  //   return this.placeRepository.setOpeningHours(id, updateOpeningHoursDto);
  // }

  // async setAlwaysOpen(id: string, uid: string, locationIdsDto: LocationIdsDto) {
  //   const user = await this.validateUser(uid);
  //   const place = await this.findById(id);
  //   if (place.userId.toString() !== uid.toString())
  //     throw new InternalServerErrorException('Illegal operation');
  //   return this.placeRepository.setAlwaysOpen(id, locationIdsDto);
  // }

  setStatus(locationId: string, updateStatusDto: UpdateStatusDto) {
    return this.placeRepository.setStatus(locationId, updateStatusDto);
  }

  findLocationIdsByUserId(uid: string) {
    return this.placeRepository.findLocationIdsByUserId(uid);
  }

  async findLocationIdsWithinRadius(
    lat: number,
    lng: number,
    radiusInMeters: number,
  ): Promise<string[]> {
    return this.placeRepository.findLocationIdsWithinRadius(
      lat,
      lng,
      radiusInMeters,
    );
  }

  incrementVisitCount(id: string) {
    return this.placeRepository.incrementVisitCount(id);
  }

  findPopular(placeFilterQuery: PlaceFilterQuery) {
    return this.placeRepository.findPopular(placeFilterQuery);
  }

  async findByUserId(uid: string) {
    const placeEmployees = await this.placeEmployeeService.findByUserId(uid);
    const bossPlaceEmployees = placeEmployees.filter(
      (pe) => pe.role === PlaceEmployeeRole.BOSS,
    );

    const placeIds = bossPlaceEmployees
      .map((pe) => pe.place?._id || pe.place)
      .filter((place) => place); // Filter out null/undefined

    if (placeIds.length === 0) {
      return [];
    }

    return this.placeRepository.find({
      _id: { $in: placeIds },
    });
  }
  async removePlace(id: string) {
    const session = await this.connection.startSession();

    try {
      await this.placeRepository.findOneAndDelete({
        _id: id,
      });
    } finally {
      await session.endSession();
    }
  }

  async search(searchQuery: SearchPlaceQuery, userId: string) {
    const { lat, lng, countryCode, start, limit } = searchQuery;

    const nearbyLocationIds = await this.findLocationIdsWithinRadius(
      lat,
      lng,
      15000,
    );

    const favoriteLocationIds = await this.userService.getFavoriteLocationIds(
      userId,
    );

    if (nearbyLocationIds.length > 0) {
      return this.placeRepository.findPaginatedByLocationIds(
        { start, limit },
        nearbyLocationIds,
        favoriteLocationIds,
      );
    }

    return this.placeRepository.findPaginatedByCountryCode(
      { start, limit },
      countryCode,
      favoriteLocationIds,
    );
  }

  async addFavoriteLocation(userId: string, locationId: string) {
    return this.userService.addFavoriteLocation(userId, locationId);
  }

  async removeFavoriteLocation(userId: string, locationId: string) {
    return this.userService.removeFavoriteLocation(userId, locationId);
  }

  async getFavoriteLocations(
    placeFilterQuery: PlaceFilterQuery,
    userId: string,
  ) {
    const favoriteLocationIds = await this.userService.getFavoriteLocationIds(
      userId,
    );

    if (favoriteLocationIds.length === 0) {
      return {
        data: [],
        metadata: [{ total: 0, start: 0, limit: placeFilterQuery.limit }],
      };
    }

    const result = await this.findFavorite(
      placeFilterQuery,
      favoriteLocationIds,
    );
    return result;
  }

  async generateLocationCode(locationId: string, userId: string) {
    const location = await this.placeRepository.findByLocationId(locationId);
    if (!location) {
      throw new NotFoundException('LOCATION_NOT_FOUND');
    }

    const existingCode =
      await this.codeService.findUnusedCodeByLocationIdAndUserId(
        locationId,
        userId,
      );

    if (existingCode) {
      return {
        code: existingCode.value,
      };
    }

    const code = await this.codeService.create({
      userId,
      locationId,
    });

    return {
      code: code.value,
    };
  }
}
