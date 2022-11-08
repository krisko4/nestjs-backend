import { InvitationModule } from './../invitation/invitation.module';
import { CodeModule } from 'src/code/code.module';
import { SubscriptionModule } from 'src/subscription/subscription.module';
import { UserModule } from 'src/user/user.module';
import { PlaceModule } from 'src/place/place.module';
import { Referral, ReferralSchema } from './schemas/referral.schema';
import { ReferralRepository } from './referral.repository';
import { forwardRef, Module } from '@nestjs/common';
import { ReferralService } from './referral.service';
import { ReferralController } from './referral.controller';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    PlaceModule,
    UserModule,
    SubscriptionModule,
    forwardRef(() => InvitationModule),
    MongooseModule.forFeature([
      { name: Referral.name, schema: ReferralSchema },
    ]),
    CodeModule,
  ],
  controllers: [ReferralController],
  providers: [ReferralService, ReferralRepository],
  exports: [ReferralService],
})
export class ReferralModule {}
