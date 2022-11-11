import { NotificationService } from 'src/notification/notification.service';
import { SubscriptionDocument } from 'src/subscription/schemas/subscription.schema';
import { CodeService } from 'src/code/code.service';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { User } from 'src/user/schemas/user.schema';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { SubscriptionFilterQuery } from './queries/subscription-filter.query';
import { SubscriptionRepository } from './subscription.repository';
import { InjectConnection } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { NotificationType } from 'src/notification/schemas/notification.schema';

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly notificationService: NotificationService,
    private readonly codeService: CodeService,
    @InjectConnection() private readonly connection: mongoose.Connection,
  ) {}

  async create(createSubscriptionDto: CreateSubscriptionDto) {
    const { userId, locationId, referralCode } = createSubscriptionDto;
    const subs = await this.findByLocationId(locationId);
    const duplicateSub = subs.find(
      (sub) => sub._id.toString() === userId.toString(),
    );
    if (duplicateSub)
      throw new InternalServerErrorException(
        `User with id: ${userId} is already a subscriber of location with id: ${locationId}`,
      );
    if (!referralCode) {
      return this.subscriptionRepository.createSubscription(
        createSubscriptionDto,
      );
    }
    const code = await this.codeService.findValidCodeByValue(
      referralCode,
      userId,
    );
    const successfullyInvitedUsers = subs.filter((sub) =>
      code.invitation.invitedUsers.includes(sub._id),
    );
    const session = await this.connection.startSession();
    let createdSub: SubscriptionDocument;
    await session.withTransaction(async () => {
      createdSub = await this.subscriptionRepository.createSubscription(
        createSubscriptionDto,
        code.invitation._id.toString(),
        session,
      );
      await this.codeService.useCode(code._id);
      if (
        successfullyInvitedUsers.length ===
        code.invitation.referral.requiredMembersCount - 1
      ) {
        const referrerId = code.invitation.referrer.toString();
        const sendSubscriptionNotification = async () => {
          const createNotificationDto = {
            title: `Congratulations! You have just won a referral reward`,
            body: 'elo',
            locationId,
            receivers: [referrerId],
            type: NotificationType.REFERRAL_REWARD,
          };
          const notification = await this.notificationService.create(
            createNotificationDto,
            session,
          );
          const { title, body, receivers } = createNotificationDto;

          return this.notificationService.sendNotification(receivers, {
            data: {
              _id: notification._id.toString(),
            },
            notification: {
              title,
              body,
            },
          });
        };
        await Promise.all([
          this.codeService.create(
            {
              userId: referrerId,
              invitationId: code.invitation._id.toString(),
            },
            session,
          ),
          sendSubscriptionNotification(),
        ]);
      }
    });
    await session.endSession();
    return createdSub;
  }

  findByUserIdAndLocationId(uid: string, locationId: string) {
    return this.subscriptionRepository.findByUserIdAndLocationId(
      uid,
      locationId,
    );
  }

  remove(subscriptionFilterQuery: SubscriptionFilterQuery) {
    const { userId, locationId } = subscriptionFilterQuery;
    if (userId && locationId) {
      return this.subscriptionRepository.deleteByUserIdAndLocationId(
        userId,
        locationId,
      );
    }
    return this.subscriptionRepository.deleteByLocationId(locationId);
  }

  async drawWinners(
    rewardPercentage: number,
    locationId: string,
    participators: User[],
  ): Promise<string[]> {
    const subscriptions = await this.subscriptionRepository.findByLocationId(
      locationId,
    );
    const validSubs = subscriptions.filter((sub) =>
      participators.some(
        (participator) =>
          participator._id.toString() === sub.user._id.toString(),
      ),
    );
    const winnersAmount = Math.ceil(rewardPercentage * 0.01 * validSubs.length);
    const shuffled = [...validSubs].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, winnersAmount).map((sub) => sub.user._id);
  }

  findByLocationId(locationId: string) {
    return this.subscriptionRepository.findByLocationId(locationId);
  }

  findByUserId(userId: string) {
    return this.subscriptionRepository.findByUserId(userId);
  }

  async find(subscriptionFilterQuery: SubscriptionFilterQuery) {
    const { userId, locationId } = subscriptionFilterQuery;
    if (userId && locationId) {
      return this.findByUserIdAndLocationId(userId, locationId);
    }
    if (userId) {
      return this.findByUserId(userId);
    }
    return this.findByLocationId(locationId);
  }
}
