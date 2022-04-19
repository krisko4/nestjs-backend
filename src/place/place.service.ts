import { Injectable } from '@nestjs/common';
import { CreatePlaceDto } from './dto/create-place.dto';
import { UpdatePlaceDto } from './dto/update-place.dto';
import { PlaceRepository } from './place.repository';
import { PlaceFilterQuery } from './query/place.filter.query';

@Injectable()
export class PlaceService {
  constructor(private readonly placeRepository: PlaceRepository) {}
  create(createPlaceDto: CreatePlaceDto) {
    return 'This action adds a new place';
  }

  findAll() {
    return this.placeRepository.find();
  }

  findActive() {
    return this.placeRepository.findActive();
  }

  findRecentlyAdded(placeFilterQuery: PlaceFilterQuery) {
    return this.placeRepository.findRecentlyAdded(placeFilterQuery);
  }

  findPopular(placeFilterQuery: PlaceFilterQuery) {
    return this.placeRepository.findPopular(placeFilterQuery);
  }

  findOne(id: number) {
    return `This action returns a #${id} place`;
  }

  update(id: number, updatePlaceDto: UpdatePlaceDto) {
    return `This action updates a #${id} place`;
  }

  remove(id: number) {
    return `This action removes a #${id} place`;
  }
}
