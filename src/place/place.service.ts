import { PaginationQuery } from './../event/queries/pagination.query';
import {
  BadRequestException,
  ForbiddenException,
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
import { UpdatePlaceDto } from './dto/update-place.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import {
  LocationIdsDto,
  UpdateOpeningHoursDto,
} from './dto/update-opening-hours.dto';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { SubscriptionDocument } from 'src/subscription/schemas/subscription.schema';
import { AddPlaceEmployeeDto } from './dto/add-place-employee.dto';
import { PlaceEmployeeRole } from './schemas/place-employee.schema';
import { SearchPlaceQuery } from './queries/search-place.query';
import { CodeService } from 'src/code/code.service';

@Injectable()
export class PlaceService {
  constructor(
    private readonly placeRepository: PlaceRepository,
    private readonly userService: UserService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly subscriptionService: SubscriptionService,
    @Inject(forwardRef(() => CodeService))
    private readonly codeService: CodeService,
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
    });
    await session.endSession();
    return registeredPlace;
  }

  findById(id: string) {
    return this.placeRepository.findById(id);
  }

  findByIdWithEmployees(id: string) {
    return this.placeRepository.findByIdWithEmployees(id);
  }

  findAll() {
    return this.placeRepository.find();
  }

  findPlacesByUserId(userId: string) {
    return this.placeRepository.findPlacesByEmployeeUserId(userId);
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
  findByUserId(uid: string, shouldPopulateUsers?: boolean) {
    return this.placeRepository.findByUserId(uid, shouldPopulateUsers);
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

  async findEmployeesByUserId(uid: string, pagination: PaginationQuery) {
    return this.placeRepository.findPaginatedEmployees(uid, pagination);
  }

  async addEmployee(
    placeId: string,
    userId: string,
    addEmployeeDto: AddPlaceEmployeeDto,
  ) {
    const place = await this.findByIdWithEmployees(placeId);
    if (!place) {
      throw new InternalServerErrorException('INVALID_PLACE_ID');
    }
    const isUserBoss = place.employees.some(
      (e) =>
        e.user &&
        e.user._id.toString() === userId &&
        e.role === PlaceEmployeeRole.BOSS,
    );
    if (!isUserBoss) {
      throw new ForbiddenException('NOT_ALLOWED');
    }
    const { email } = addEmployeeDto;
    if (place.employees.some((e) => e.email === email)) {
      throw new BadRequestException('EMPLOYEE_ALREADY_ADDED');
    }
    const employeeUser = await this.userService.findByEmail(
      addEmployeeDto.email,
    );
    return this.placeRepository.addEmployee(
      placeId,
      addEmployeeDto,
      employeeUser?._id,
    );
  }

  async removeEmployee(userId: string, placeId: string, employeeId: string) {
    const place = await this.findByIdWithEmployees(placeId);
    if (!place) {
      throw new InternalServerErrorException('INVALID_PLACE_ID');
    }
    const isUserBoss = place.employees.some(
      (e) =>
        e.user &&
        e.user._id.toString() === userId &&
        e.role === PlaceEmployeeRole.BOSS,
    );
    if (!isUserBoss) {
      throw new ForbiddenException('NOT_ALLOWED');
    }
    const deletedEmployee = place.employees.find(
      (e) => e._id.toString() === employeeId,
    );
    if (!deletedEmployee) {
      throw new BadRequestException('INVALID_EMPLOYEE_ID');
    }
    if (
      deletedEmployee.user &&
      deletedEmployee.user._id.toString() === userId
    ) {
      throw new BadRequestException('CANNOT_DELETE_YOURSELF');
    }
    return this.placeRepository.removeEmployee(placeId, employeeId);
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
