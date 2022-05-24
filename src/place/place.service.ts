import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
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

@Injectable()
export class PlaceService {
  constructor(
    private readonly placeRepository: PlaceRepository,
    private readonly userService: UserService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly subscriptionService: SubscriptionService,
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
    updatePlaceDto: UpdatePlaceDto,
    uid: string,
    logo?: Express.Multer.File[],
    images?: Express.Multer.File[],
  ) {
    const user = await this.validateUser(uid);
    const place = await this.findByLocationId(updatePlaceDto.locationId);
    if (!place) throw new InternalServerErrorException('Invalid locationId');
    if (!user._id.equals(place.userId))
      throw new InternalServerErrorException('Illegal operation');
    const { locations } = updatePlaceDto;
    for (const location of locations) {
      const { lat, lng } = location;
      const occupiedAddress = await this.findByLatLng(lat, lng);
      if (occupiedAddress)
        throw new InternalServerErrorException(
          `The address: ${occupiedAddress} is already occupied by another place`,
        );
    }
    const session = await this.connection.startSession();
    let updatedPlace: PlaceDocument;
    await session.withTransaction(async () => {
      let newLogoId: string;
      if (logo) {
        await this.cloudinaryService.destroyImage(place.logo);
        newLogoId = await this.cloudinaryService.uploadImage(
          logo[0].path,
          'place_logos',
        );
      }
      let newImages: string[];
      if (images) {
        await place.images.map((image) =>
          this.cloudinaryService.destroyImage(image),
        );
        for (const image of images) {
          const newImageId = await this.cloudinaryService.uploadImage(
            image.path,
            'place_images',
          );
          newImages.push(newImageId);
        }
      }
      updatedPlace = await this.placeRepository.updatePlace(
        updatePlaceDto,
        user._id,
        session,
        newImages,
        newLogoId,
      );
    });
    await session.endSession();
    return updatedPlace;
  }
  async create(
    createPlaceDto: CreatePlaceDto,
    logo: Express.Multer.File[],
    images: Express.Multer.File[],
    uid: string,
  ) {
    const { locations } = createPlaceDto;
    const user = await this.validateUser(uid);
    if (!logo)
      throw new BadRequestException(
        'Request is missing necessary upload files - logo is required',
      );
    if (logo.length !== 1)
      throw new BadRequestException('Exactly one logo file is required');
    for (const location of locations) {
      const { lat, lng } = location;
      const occupiedAddress = await this.findByLatLng(lat, lng);
      if (occupiedAddress)
        throw new InternalServerErrorException(
          `The address: ${occupiedAddress} is already occupied by another place`,
        );
    }
    const session = await this.connection.startSession();
    let registeredPlace: PlaceDocument;
    await session.withTransaction(async () => {
      const logoUrl = await this.cloudinaryService.uploadImage(
        logo[0].path,
        'place_logos',
      );
      const imageUrls = [];
      if (images) {
        for (const image of images) {
          const imageId = await this.cloudinaryService.uploadImage(
            image.path,
            'place_images',
          );
          imageUrls.push(imageId);
        }
      }
      registeredPlace = await this.placeRepository.createPlace(
        imageUrls,
        logoUrl,
        createPlaceDto,
        user._id,
        session,
      );
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

  findFavorite(placeFilterQuery: PlaceFilterQuery, favIds: string) {
    if (!favIds) return [];
    return this.placeRepository.findByLocationIds(
      placeFilterQuery,
      favIds.split(','),
    );
  }

  findLocation(id: string, locationId: string) {
    return this.placeRepository.findLocation(id, locationId);
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

  async setOpeningHours(
    id: string,
    uid: string,
    updateOpeningHoursDto: UpdateOpeningHoursDto,
  ) {
    const user = await this.validateUser(uid);
    const place = await this.findById(id);
    if (place.userId.toString() !== uid.toString())
      throw new InternalServerErrorException('Illegal operation');
    return this.placeRepository.setOpeningHours(id, updateOpeningHoursDto);
  }

  async setAlwaysOpen(id: string, uid: string, locationIdsDto: LocationIdsDto) {
    const user = await this.validateUser(uid);
    const place = await this.findById(id);
    if (place.userId.toString() !== uid.toString())
      throw new InternalServerErrorException('Illegal operation');
    return this.placeRepository.setAlwaysOpen(id, locationIdsDto);
  }

  setStatus(locationId: string, updateStatusDto: UpdateStatusDto) {
    return this.placeRepository.setStatus(locationId, updateStatusDto);
  }

  findLocationIdsByUserId(uid: string) {
    return this.placeRepository.findLocationIdsByUserId(uid);
  }

  incrementVisitCount(id: string) {
    return this.placeRepository.incrementVisitCount(id);
  }

  findPopular(placeFilterQuery: PlaceFilterQuery) {
    return this.placeRepository.findPopular(placeFilterQuery);
  }
  findByUserId(uid: string) {
    return this.placeRepository.findByUserId(uid);
  }
}
