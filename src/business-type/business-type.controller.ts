import { Controller, Get } from '@nestjs/common';
import { BusinessTypeService } from './business-type.service';

@Controller('business-types')
export class BusinessTypeController {
  constructor(private readonly businessTypeService: BusinessTypeService) {}

  @Get()
  findAll() {
    return this.businessTypeService.findAll();
  }
}
