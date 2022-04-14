import { Module } from '@nestjs/common';
import { BusinessTypeService } from './business-type.service';
import { BusinessTypeController } from './business-type.controller';
import { MongooseModule } from '@nestjs/mongoose';
import {
  BusinessType,
  BusinessTypeSchema,
} from './schemas/business-type.schema';
import { BusinessTypeRepository } from './business-type.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BusinessType.name, schema: BusinessTypeSchema },
    ]),
  ],
  controllers: [BusinessTypeController],
  providers: [BusinessTypeService, BusinessTypeRepository],
})
export class BusinessTypeModule {}
