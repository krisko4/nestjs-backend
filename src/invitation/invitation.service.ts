import { InvitationDocument } from './schemas/invitation.schema';
import { CodeService } from 'src/code/code.service';
import { PlaceService } from 'src/place/place.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { UserService } from 'src/user/user.service';
import { ReferralService } from './../referral/referral.service';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { plainToInstance } from 'class-transformer';
import { InvitationRepository } from './invitation.repository';
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { User } from 'src/user/schemas/user.schema';
import { InjectConnection } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { InvitationQuery } from './queries/invitation.query';

@Injectable()
export class InvitationService {
  constructor(
    private readonly invitationRepository: InvitationRepository,
    private readonly subscriptionService: SubscriptionService,
    @Inject(forwardRef(() => ReferralService))
    private readonly referralService: ReferralService,
    private readonly userService: UserService,
    private readonly placeService: PlaceService,
    private readonly codeService: CodeService,
    @InjectConnection() private readonly connection: mongoose.Connection,
  ) {}

  async create(createInvitationDto: CreateInvitationDto, userId: string) {
    const { invitedEmail, referralId } = createInvitationDto;
    const invitedUser = await this.userService.findByEmail(invitedEmail);
    if (!invitedUser) {
      throw new InternalServerErrorException('USER_NOT_FOUND');
    }
    if (invitedUser._id.toString() === userId.toString()) {
      throw new InternalServerErrorException('USER_IS_REFERRER');
    }
    const referral = await this.referralService.findById(referralId);
    if (!referral) {
      throw new BadRequestException('INVALID_REFERRAL_ID');
    }
    const sub = await this.subscriptionService.findByUserIdAndLocationId(
      invitedUser._id,
      referral.locationId,
    );
    if (sub) {
      throw new BadRequestException('USER_ALREADY_SUBSCRIBES');
    }
    const place = await this.placeService.findByLocationId(referral.locationId);
    if (place.userId.toString() === invitedUser._id.toString()) {
      throw new InternalServerErrorException('USER_ALREADY_INVITED');
    }
    const existingInvitation = await this.findByReferralIdAndReferrerId(
      referral._id,
      userId,
    );
    let updatedInvitation: InvitationDocument;

    const session = await this.connection.startSession();

    await session.withTransaction(async () => {
      if (!existingInvitation) {
        updatedInvitation = await this.invitationRepository.createInvitation(
          referral._id,
          userId,
          invitedUser._id,
          session,
        );
      } else {
        const invitedUsers = [
          ...existingInvitation.invitedUsers.map((u) => u._id),
          invitedUser._id,
        ];
        if (
          existingInvitation.invitedUsers.some(
            (uid) => uid.toString === invitedUser._id.toString(),
          )
        ) {
          throw new InternalServerErrorException('USER_ALREADY_INVITED');
        }
        updatedInvitation = await this.invitationRepository.updateInvitation(
          existingInvitation._id,
          invitedUsers,
          session,
        );
      }
      await this.codeService.create(
        {
          userId: invitedUser._id,
          invitationId: updatedInvitation._id,
        },
        session,
      );
    });
    await session.endSession();
    return updatedInvitation;
  }

  async findByReferralIdAndReferrerId(referralId: string, referrerId: string) {
    const invitation =
      await this.invitationRepository.findByReferralIdAndReferrerId(
        referralId,
        referrerId,
      );
    if (!invitation) return;
    const referral = await this.referralService.findById(referralId);
    const subscriptions = await this.subscriptionService.findByLocationId(
      referral.locationId,
    );
    return {
      ...invitation,
      invitedUsers: invitation.invitedUsers.map((user) => ({
        ...plainToInstance(User, user),
        isSubscriber: subscriptions.some(
          (sub) => sub.user._id.toString() === user._id.toString(),
        ),
      })),
    };
  }

  findByQuery(query: InvitationQuery, userId: string) {
    const { referralId } = query;
    if (referralId) {
      return this.findByReferralIdAndReferrerId(referralId, userId);
    }
  }
}
