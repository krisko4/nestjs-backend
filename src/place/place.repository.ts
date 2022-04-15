import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { IRepository } from '../database/repository';
import { Place, PlaceDocument } from './schemas/place.schema';

@Injectable()
export class PlaceRepository extends IRepository<PlaceDocument> {
  constructor(
    @InjectModel(Place.name) private readonly placeModel: Model<PlaceDocument>,
  ) {
    super(placeModel);
  }
}
