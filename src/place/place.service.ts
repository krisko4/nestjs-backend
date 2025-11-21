import { toMongoObjectId } from './../utils/mongo';
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
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
import { UpdatePlaceDto } from './dto/update-place.dto';

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

  async update(
    id: string,
    updatePlaceDto: UpdatePlaceDto,
    uid: string,
    logo?: Express.Multer.File[],
  ) {
    await this.validateUser(uid);
    const place = await this.findById(id);
    if (!place) throw new NotFoundException('Place not found');

    // Check if user is boss of this place
    const isUserBoss = await this.placeEmployeeService.isUserBossOfPlace(
      uid,
      place._id.toString(),
    );
    if (!isUserBoss) {
      throw new UnauthorizedException('ILLEGAL_OPERATION');
    }

    const { locations } = updatePlaceDto;

    // Validate that we won't delete all locations
    if (locations) {
      if (locations.length === 0) {
        throw new BadRequestException('Place must have at least one location');
      }
    }

    const session = await this.connection.startSession();
    let updatedPlace: PlaceDocument;

    try {
      await session.withTransaction(async () => {
        // Handle logo update
        let newLogoId: string | undefined;
        if (logo && logo.length > 0) {
          if (place.logo) {
            await this.cloudinaryService.destroyImage(place.logo);
          }
          newLogoId = await this.cloudinaryService.uploadImage(
            logo[0],
            'place_logos',
          );
        }

        // Build update object
        const updateData: Record<string, unknown> = {};

        if (updatePlaceDto.name) {
          updateData.name = updatePlaceDto.name;
        }
        if (updatePlaceDto.description !== undefined) {
          updateData.description = updatePlaceDto.description;
        }
        if (newLogoId) {
          updateData.logo = newLogoId;
        }

        // Build new locations array if locations provided
        const newLocationsArray = [];
        const addedLocationIds: mongoose.Types.ObjectId[] = [];

        if (locations) {
          // Process each incoming location
          for (const location of locations) {
            if (location._id) {
              // Update existing location - find original to preserve fields
              const existingLoc = place.locations.find(
                (loc) => loc._id.toString() === location._id,
              );
              if (existingLoc) {
                newLocationsArray.push({
                  _id: existingLoc._id,
                  address: location.address,
                  addressId: location.addressId,
                  countryCode: location.countryCode,
                  lat: location.lat,
                  lng: location.lng,
                  phone: location.phone,
                  email: location.email,
                  website: location.website,
                  facebook: location.facebook,
                  instagram: location.instagram,
                  alwaysOpen: existingLoc.alwaysOpen,
                  status: existingLoc.status,
                  openingHours: existingLoc.openingHours,
                  isActive: existingLoc.isActive,
                  visitCount: existingLoc.visitCount,
                  averageNote: existingLoc.averageNote,
                });
              }
            } else {
              // Add new location
              const newLocId = new mongoose.Types.ObjectId();
              newLocationsArray.push({
                _id: newLocId,
                address: location.address,
                addressId: location.addressId,
                countryCode: location.countryCode,
                lat: location.lat,
                lng: location.lng,
                phone: location.phone,
                email: location.email,
                website: location.website,
                facebook: location.facebook,
                instagram: location.instagram,
                isActive: true,
                status: 'closed',
                visitCount: 0,
              });
              addedLocationIds.push(newLocId);
            }
          }

          updateData.locations = newLocationsArray;
        }

        // Create PlaceEmployee for new locations
        if (addedLocationIds.length > 0) {
          const employees = await this.employeeService.findByUserId(uid);
          if (employees && employees.length > 0) {
            for (const newLocId of addedLocationIds) {
              await this.placeEmployeeService.createPlaceEmployee(
                {
                  place: place._id,
                  location: newLocId,
                  employee: employees[0]._id,
                  role: PlaceEmployeeRole.BOSS,
                  status: PlaceEmployeeStatus.ACTIVE,
                },
                session,
              );
            }
          }
        }

        // Apply basic field updates
        if (Object.keys(updateData).length > 0) {
          await this.placeRepository.findByIdAndUpdate(
            place._id.toString(),
            updateData,
            { session },
          );
        }
      });
    } finally {
      await session.endSession();
    }

    return updatedPlace;
  }

  async create(
    createPlaceDto: CreatePlaceDto,
    logo: Express.Multer.File[] | undefined,
    images: Express.Multer.File[],
    uid: string,
  ) {
    const user = await this.validateUser(uid);
    if (logo && logo.length > 1)
      throw new BadRequestException('Exactly one logo file is required');
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
