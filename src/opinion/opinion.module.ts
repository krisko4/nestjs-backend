import { Module } from '@nestjs/common';
import { OpinionService } from './opinion.service';
import { OpinionController } from './opinion.controller';
import { Opinion, OpinionSchema } from './schemas/opinion.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from 'src/user/user.module';
import { OpinionRepository } from './opinion.repository';
import { PlaceModule } from 'src/place/place.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Opinion.name, schema: OpinionSchema }]),
    UserModule,
    PlaceModule,
  ],
  controllers: [OpinionController],
  providers: [OpinionService, OpinionRepository],
})
export class OpinionModule {}
