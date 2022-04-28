import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery } from 'mongoose';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { IRepository } from '../database/repository';
import { Place, PlaceDocument } from './schemas/place.schema';
import { PlaceFilterQuery } from './query/place.filter.query';
import { getGroupedLocationData } from './aggregations/grouped-location-data';
import { getPaginatedPlaceData } from './aggregations/paginated-place-data';

@Injectable()
export class PlaceRepository extends IRepository<PlaceDocument> {
  constructor(
    @InjectModel(Place.name) private readonly placeModel: Model<PlaceDocument>,
  ) {
    super(placeModel);
  }
  async findActive() {
    return this.find({ 'locations.isActive': true });
  }

  async findByUserId(id: string) {
    return this.find({ userId: new Types.ObjectId(id) });
  }

  private async findActiveAndSortAndPaginate(
    start: number,
    limit: number,
    sortQuery: FilterQuery<Model<PlaceDocument>>,
    entityFilterQuery: FilterQuery<Model<PlaceDocument>>,
  ) {
    return this.placeModel
      .aggregate()
      .unwind('locations')
      .match({
        'locations.isActive': true,
        ...entityFilterQuery,
      })
      .sort(sortQuery)
      .facet(getPaginatedPlaceData(start, limit));
  }

  private createFilterQuery(name: string, type: string, address: string) {
    const filterQuery = {};
    if (name) filterQuery['name'] = new RegExp(name, 'i');
    if (address) filterQuery['locations.address'] = new RegExp(address, 'i');
    if (type) filterQuery['type'] = new RegExp(type, 'i');
    return filterQuery;
  }

  async findPopular(placeFilterQuery: PlaceFilterQuery) {
    const sortQuery = { 'locations.visitCount': -1 };
    return this.findSorted(placeFilterQuery, sortQuery);
  }

  private async findSorted(
    placeFilterQuery: PlaceFilterQuery,
    sortQuery: FilterQuery<Model<PlaceDocument>>,
  ) {
    const { start, limit, name, type, address } = placeFilterQuery;
    const filterQuery = this.createFilterQuery(name, type, address);
    return this.findActiveAndSortAndPaginate(
      start,
      limit,
      sortQuery,
      filterQuery,
    );
  }

  async findRecentlyAdded(placeFilterQuery: PlaceFilterQuery) {
    const sortQuery = { createdAt: -1 };
    return this.findSorted(placeFilterQuery, sortQuery);
  }

  async findTopRated(placeFilterQuery: PlaceFilterQuery) {
    const sortQuery = { 'locations.averageNote.average': -1 };
    return this.findSorted(placeFilterQuery, sortQuery);
  }

  async incrementVisitCount(id: string) {
    return this.findOneAndUpdate(
      { 'locations._id': id },
      { $inc: { visitCount: 1 } },
    );
  }

  async findLocation(id: string, locationId: string) {
    const foundPlaces = await this.placeModel
      .aggregate()
      .unwind('locations')
      .match({
        _id: new Types.ObjectId(id),
        'locations._id': new Types.ObjectId(locationId),
      })
      .group(getGroupedLocationData());
    const place = foundPlaces[0];
    if (!place) throw new InternalServerErrorException('Invalid locationId');
    return place;
  }

  async findByLatLng(lat: number, lng: number) {
    return this.findOne({ 'locations.lat': lat, 'locations.lng': lng });
  }

  async findFavorite(placeFilterQuery: PlaceFilterQuery, favIds: string[]) {
    const ids = favIds.map((el) => new Types.ObjectId(el));
    const { start, limit, name, type, address } = placeFilterQuery;
    const filterQuery = this.createFilterQuery(name, type, address);
    const sortQuery = { createdAt: -1 };
    return this.findActiveAndSortAndPaginate(start, limit, sortQuery, {
      ...filterQuery,
      'locations._id': {
        $in: ids,
      },
    });
  }
}
