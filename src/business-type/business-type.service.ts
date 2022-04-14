import { Injectable } from '@nestjs/common';
import { BusinessTypeRepository } from './business-type.repository';

@Injectable()
export class BusinessTypeService {
  constructor(
    private readonly businessTypeRepository: BusinessTypeRepository,
  ) {}
  findAll() {
    return this.businessTypeRepository.find();
  }
}
