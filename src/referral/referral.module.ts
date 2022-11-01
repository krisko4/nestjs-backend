import { UserModule } from 'src/user/user.module';
import { PlaceModule } from 'src/place/place.module';
import { Referral, ReferralSchema } from './schemas/referral.schema';
import { ReferralRepository } from './referral.repository';
import { Module } from '@nestjs/common';
import { ReferralService } from './referral.service';
import { ReferralController } from './referral.controller';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    PlaceModule,
    UserModule,
    MongooseModule.forFeature([
      { name: Referral.name, schema: ReferralSchema },
    ]),
  ],
  controllers: [ReferralController],
  providers: [ReferralService, ReferralRepository],
})
export class ReferralModule {}
