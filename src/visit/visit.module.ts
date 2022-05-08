import { Module } from '@nestjs/common';
import { VisitService } from './visit.service';
import { VisitController } from './visit.controller';
import { VisitRepository } from './visit.repository';
import { MongooseModule } from '@nestjs/mongoose';
import { Visit, VisitSchema } from './schemas/visit.schema';
import { PlaceModule } from 'src/place/place.module';

@Module({
  imports: [
    PlaceModule,
    MongooseModule.forFeature([{ name: Visit.name, schema: VisitSchema }]),
  ],
  controllers: [VisitController],
  providers: [VisitService, VisitRepository],
})
export class VisitModule {}
