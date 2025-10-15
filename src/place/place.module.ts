import { Module, forwardRef } from '@nestjs/common';
import { PlaceService } from './place.service';
import { PlaceRepository } from './place.repository';
import { Place, PlaceSchema } from './schemas/place.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from 'src/user/user.module';
import { AuthModule } from 'src/auth/auth.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { SubscriptionModule } from 'src/subscription/subscription.module';
import { CodeModule } from 'src/code/code.module';
import { MulterConfigService } from 'src/multer-config/multer-config.service';
import { MulterModule } from '@nestjs/platform-express';
import { AdminPlaceController } from './place.controller.admin';
import { UserPlaceController } from './place.controller.user';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Place.name, schema: PlaceSchema }]),
    UserModule,
    AuthModule,
    CloudinaryModule,
    SubscriptionModule,
    forwardRef(() => CodeModule),
    MulterModule.registerAsync({
      useClass: MulterConfigService,
    }),
  ],
  controllers: [AdminPlaceController, UserPlaceController],
  providers: [PlaceService, PlaceRepository],
  exports: [PlaceService],
})
export class PlaceModule {}
