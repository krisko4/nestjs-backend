import { MongoRepository } from '../database/repository';
import {
  BusinessType,
  BusinessTypeDocument,
} from './schemas/business-type.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';

@Injectable()
export class BusinessTypeRepository extends MongoRepository<BusinessTypeDocument> {
  constructor(
    @InjectModel(BusinessType.name)
    businessTypeModel: Model<BusinessTypeDocument>,
  ) {
    super(businessTypeModel);
  }
}
