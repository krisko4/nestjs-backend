import { ReferralModule } from './../referral/referral.module';
import { InvitationRepository } from './invitation.repository';
import { forwardRef, Inject, Module } from '@nestjs/common';
import { InvitationService } from './invitation.service';
import { InvitationController } from './invitation.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { CodeModule } from 'src/code/code.module';
import { PlaceModule } from 'src/place/place.module';
import { SubscriptionModule } from 'src/subscription/subscription.module';
import { UserModule } from 'src/user/user.module';
import { Invitation, InvitationSchema } from './schemas/invitation.schema';

@Module({
  imports: [
    PlaceModule,
    UserModule,
    forwardRef(() => ReferralModule),

    // ReferralModule,
    SubscriptionModule,
    MongooseModule.forFeature([
      { name: Invitation.name, schema: InvitationSchema },
    ]),
    CodeModule,
  ],
  controllers: [InvitationController],
  providers: [InvitationService, InvitationRepository],
  exports: [InvitationService],
})
export class InvitationModule {}
