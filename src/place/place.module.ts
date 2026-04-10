import { Module, forwardRef } from '@nestjs/common';
import { PlaceService } from './place.service';
import { PlaceRepository } from './place.repository';
import { Place, PlaceSchema } from './schemas/place.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from 'src/user/user.module';
import { AuthModule } from 'src/auth/auth.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { CodeModule } from 'src/code/code.module';
import { EmployeeModule } from 'src/employee/employee.module';
import { PointsModule } from 'src/points/points.module';
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
    forwardRef(() => CodeModule),
    forwardRef(() => EmployeeModule),
    PointsModule,
    MulterModule.registerAsync({
      useClass: MulterConfigService,
    }),
  ],
  controllers: [AdminPlaceController, UserPlaceController],
  providers: [PlaceService, PlaceRepository],
  exports: [PlaceService, PlaceRepository],
})
export class PlaceModule {}
