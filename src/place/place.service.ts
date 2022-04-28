import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { CreatePlaceDto } from './dto/create-place.dto';
import { PlaceRepository } from './place.repository';
import { PlaceFilterQuery } from './query/place.filter.query';

@Injectable()
export class PlaceService {
  constructor(
    private readonly placeRepository: PlaceRepository,
    private readonly userService: UserService,
  ) {}
  async create(
    createPlaceDto: CreatePlaceDto,
    logo: Express.Multer.File[],
    images: Express.Multer.File[],
    uid: string,
  ) {
    const { locations } = createPlaceDto;
    console.log(logo, images);
    const user = await this.userService.findById(uid);
    if (!user)
      throw new InternalServerErrorException(
        'User with provided uid not found',
      );
    if (!logo)
      throw new BadRequestException(
        'Request is missing necessary upload files - logo is required',
      );
    if (logo.length !== 1)
      throw new BadRequestException('Exactly one logo file is required');
    for (const location of locations) {
      const { lat, lng } = location;
      const occupiedAddress = await this.findByLatLng(lat, lng);
      if (!occupiedAddress)
        throw new InternalServerErrorException(
          `The address: ${occupiedAddress} is already occupied by another place`,
        );
    }
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

  findRecentlyAdded(placeFilterQuery: PlaceFilterQuery) {
    return this.placeRepository.findRecentlyAdded(placeFilterQuery);
  }

  findTopRated(placeFilterQuery: PlaceFilterQuery) {
    return this.placeRepository.findTopRated(placeFilterQuery);
  }

  findFavorite(placeFilterQuery: PlaceFilterQuery, favIds: string) {
    if (!favIds) return [];
    return this.placeRepository.findFavorite(
      placeFilterQuery,
      favIds.split(','),
    );
  }

  findLocation(id: string, locationId: string) {
    return this.placeRepository.findLocation(id, locationId);
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
