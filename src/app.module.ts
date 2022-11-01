import { Module } from '@nestjs/common';
import { BusinessTypeModule } from './business-type/business-type.module';
import { NewsModule } from './news/news.module';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { RegistrationModule } from './registration/registration.module';
import { VisitModule } from './visit/visit.module';
import { OpinionModule } from './opinion/opinion.module';
import { ContactModule } from './contact/contact.module';
import { PlaceModule } from './place/place.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { EventModule } from './event/event.module';
import { MulterConfigModule } from './multer-config/multer-config.module';
import { NotificationModule } from './notification/notification.module';
import { RewardModule } from './reward/reward.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CodeModule } from './code/code.module';
import { GeolocationModule } from './geolocation/geolocation.module';
import { ReferralModule } from './referral/referral.module';

@Module({
  imports: [
    BusinessTypeModule,
    NewsModule,
    DatabaseModule,
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    UserModule,
    AuthModule,
    RegistrationModule,
    VisitModule,
    OpinionModule,
    ContactModule,
    PlaceModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    CloudinaryModule,
    SubscriptionModule,
    EventModule,
    MulterConfigModule,
    NotificationModule,
    RewardModule,
    CodeModule,
    GeolocationModule,
    ReferralModule,
  ],
})
export class AppModule {}
