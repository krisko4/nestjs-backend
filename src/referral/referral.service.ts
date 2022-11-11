import { NotificationService } from 'src/notification/notification.service';
import { ReferralDocument } from './schemas/referral.schema';
import { InvitationService } from './../invitation/invitation.service';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { ReferralQuery } from './queries/referral.query';
import { PlaceService } from 'src/place/place.service';
import { ReferralRepository } from './referral.repository';
import {
  Injectable,
  InternalServerErrorException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { CreateReferralDto } from './dto/create-referral.dto';
import mongoose from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { NotificationType } from 'src/notification/schemas/notification.schema';

@Injectable()
export class ReferralService {
  constructor(
    private readonly referralRepository: ReferralRepository,
    private readonly placeService: PlaceService,
    private readonly subscriptionService: SubscriptionService,
    private readonly notificationService: NotificationService,
    @Inject(forwardRef(() => InvitationService))
    private invitationService: InvitationService,
    @InjectConnection() private readonly connection: mongoose.Connection,
  ) {}

  async create(createReferralDto: CreateReferralDto, userId: string) {
    const { locationId } = createReferralDto;
    await this.validateReferralLocation(locationId, userId);
    const session = await this.connection.startSession();
    let newReferral: ReferralDocument;
    const place = await this.placeService.findByLocationId(locationId);
    await session.withTransaction(async () => {
      newReferral = await this.referralRepository.createReferral(
        createReferralDto,
        session,
      );
      const subs = await this.subscriptionService.findByLocationId(locationId);
      const receivers = subs.map((sub) => sub.user._id);
      if (receivers.length > 0) {
        const createNotificationDto = {
          title: `${place.name} has added a new referral!`,
          body: 'Click me to find out what you can win for inviting your friends',
          locationId,
          receivers,
          type: NotificationType.NEW_REFERRAL,
        };
        const notification = await this.notificationService.create(
          createNotificationDto,
          session,
        );
        const { body, title } = createNotificationDto;
        await this.notificationService.sendNotification(receivers, {
          data: {
            _id: notification._id.toString(),
            title,
            body,
            locationName: place.name,
          },
          notification: {
            title,
            body,
          },
        });
      }
    });
    await session.endSession();
    return newReferral;
  }

  private async validateReferralLocation(locationId: string, userId: string) {
    const place = await this.placeService.findByLocationId(locationId);
    if (!place) throw new InternalServerErrorException('PLACE_NOT_FOUND');
    if (place.userId.toString() !== userId.toString()) {
      throw new InternalServerErrorException('OPERATION_FORBIDDEN');
    }
    return place;
  }

  async findByLocationId(locationId: string, userId: string) {
    const place = await this.placeService.findByLocationId(locationId);
    const isUserOwner = place.userId.toString() === userId.toString();
    const refs = await this.referralRepository.findByLocationId(locationId);
    const subscriptions = await this.subscriptionService.findByLocationId(
      locationId,
    );
    if (isUserOwner) return refs;
    return Promise.all(
      refs.map(async (ref) => {
        const invitation =
          await this.invitationService.findByReferralIdAndReferrerId(
            ref._id,
            userId,
          );
        return {
          ...ref,
          invitations: invitation
            ? [
                {
                  ...invitation,
                  invitedUsers: invitation.invitedUsers.filter((u) =>
                    subscriptions.some(
                      (sub) => sub.user._id.toString() === u._id.toString(),
                    ),
                  ),
                },
              ]
            : [],
        };
      }),
    );
  }

  async findById(id: string) {
    return this.referralRepository.findById(id);
  }

  async findByQuery(query: ReferralQuery, userId: string) {
    const { locationId } = query;
    if (locationId) {
      return this.findByLocationId(locationId, userId);
    }
  }
}
