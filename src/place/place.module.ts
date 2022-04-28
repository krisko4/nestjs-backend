import { Module } from '@nestjs/common';
import { PlaceService } from './place.service';
import { PlaceController } from './place.controller';
import { PlaceRepository } from './place.repository';
import { Place, PlaceSchema } from './schemas/place.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { UserService } from 'src/user/user.service';
import { UserModule } from 'src/user/user.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Place.name, schema: PlaceSchema }]),
    UserModule,
    AuthModule,
  ],
  controllers: [PlaceController],
  providers: [PlaceService, PlaceRepository],
})
export class PlaceModule {}
