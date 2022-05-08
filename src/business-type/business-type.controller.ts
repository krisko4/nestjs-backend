import { Controller, Get } from '@nestjs/common';
import { BusinessTypeService } from './business-type.service';
import { BusinessType } from './schemas/business-type.schema';
import { plainToInstance } from 'class-transformer';

@Controller('business-types')
export class BusinessTypeController {
  constructor(private readonly businessTypeService: BusinessTypeService) {}

  @Get()
  async findAll() {
    const businessTypes = await this.businessTypeService.findAll();
    return businessTypes.map((type) => type.name);
  }
}
