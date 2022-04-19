import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { IRepository } from '../database/repository';
import { Place, PlaceDocument } from './schemas/place.schema';
import { PlaceFilterQuery } from './query/place.filter.query';

@Injectable()
export class PlaceRepository extends IRepository<PlaceDocument> {
  constructor(
    @InjectModel(Place.name) private readonly placeModel: Model<PlaceDocument>,
  ) {
    super(placeModel);
  }
  async findActive() {
    return this.find({ 'locations.isActive': true })
  }
  private getPaginatedPlaceData(start: number, limit: number) {
    return {
      metadata: [
        { $count: 'total' },
        {
          $addFields: {
            start: start,
            limit: limit
          }
        }
      ],
      data: [
        { $skip: start },
        { $limit: limit },
        {
          $project: {
            _id: 1,
            name: 1,
            subtitle: 1,
            type: 1,
            logo: {
              $concat: [`${process.env.CLOUDI_URL}/`, '$logo']
            },
            status: '$locations.status',
            locationId: '$locations._id',
            lat: '$locations.lat',
            lng: '$locations.lng',
            address: "$locations.address",
          }
        }
      ]

    }
  }

  private async findActiveAndSortAndPaginate(start: number, limit: number, sortQuery: FilterQuery<Model<PlaceDocument>>, entityFilterQuery: FilterQuery<Model<PlaceDocument>>) {
    return this.placeModel.aggregate()
      .unwind('locations')
      .match({
        'locations.isActive': true,
        ...entityFilterQuery
      })
      .sort(sortQuery)
      .facet(this.getPaginatedPlaceData(start, limit))
  }

  private createFilterQuery(name: string, type: string, address: string) {
    const filterQuery = {}
    if (name) filterQuery['name'] = new RegExp(name, 'i')
    if (address) filterQuery['locations.address'] = new RegExp(address, 'i')
    if (type) filterQuery['type'] = new RegExp(type, 'i')
    return filterQuery
  }

  async findPopular(placeFilterQuery: PlaceFilterQuery) {
    const sortQuery = { 'locations.visitCount': -1 }
    return this.findSorted(placeFilterQuery, sortQuery);
  }

  private async findSorted(placeFilterQuery: PlaceFilterQuery, sortQuery: FilterQuery<Model<PlaceDocument>>){
    const { start, limit, name, type, address } = placeFilterQuery;
    const filterQuery = this.createFilterQuery(name, type, address);
    return this.findActiveAndSortAndPaginate(start, limit, filterQuery, sortQuery);
  }

  async findRecentlyAdded(placeFilterQuery: PlaceFilterQuery) {
    const sortQuery = { createdAt: -1 }
    return this.findSorted(placeFilterQuery, sortQuery);
  }

  async findTopRated(placeFilterQuery: PlaceFilterQuery) {
    const sortQuery = { 'locations.averageNote.average': -1 }
    return this.findSorted(placeFilterQuery, sortQuery);
  }

}
