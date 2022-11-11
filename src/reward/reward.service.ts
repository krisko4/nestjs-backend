import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { CreateRewardDto } from './dto/create-reward.dto';
import { RewardFilterQuery } from './queries/reward-filter.query';
import { RewardRepository } from './reward.repository';
import mongoose from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { CodeService } from 'src/code/code.service';
import { EventService } from 'src/event/event.service';
import { Event } from 'src/event/schemas/event.schema';
import { RewardDocument } from './schemas/reward.schema';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationType } from 'src/notification/schemas/notification.schema';
import { addSeconds, subMinutes } from 'date-fns';

@Injectable()
export class RewardService {
  constructor(
    private readonly rewardRepository: RewardRepository,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly eventService: EventService,
    private readonly subscriptionService: SubscriptionService,
    private readonly codeService: CodeService,
    private readonly notificationService: NotificationService,
    @InjectConnection() private readonly connection: mongoose.Connection,
  ) {}

  async find(rewardFilterQuery: RewardFilterQuery, userId: string) {
    const { eventId } = rewardFilterQuery;
    if (userId && eventId) {
      return this.findByUserIdAndEventId(userId, eventId);
    }
    if (userId) {
      return this.findByUserId(userId);
    }
    return this.findByEventId(eventId);
  }

  private findByUserIdAndEventId(uid: string, eventId: string) {
    return this.rewardRepository.findByUserIdAndEventId(uid, eventId);
  }

  findByEventId(eventId: string) {
    return this.rewardRepository.findByEventId(eventId);
  }

  findByUserId(userId: string) {
    return this.rewardRepository.findByUserId(userId);
  }

  private async createRewardWithCodes(
    description: string,
    event: Event,
    rewardPercentage: number,
    scheduledFor?: Date,
    rewardId?: string,
  ) {
    const { _id: eventId, locationId, participators } = event;
    const happyWinners = await this.subscriptionService.drawWinners(
      rewardPercentage,
      locationId,
      participators,
    );

    const session = await this.connection.startSession();
    await session.withTransaction(async () => {
      let reward: RewardDocument;
      if (rewardId) {
        reward = await this.rewardRepository.findByIdAndUpdate(
          rewardId,
          {
            description,
            eventId,
            rewardPercentage,
            date: new Date(),
          },
          session,
        );
      } else {
        reward = await this.rewardRepository.createReward(
          description,
          eventId,
          rewardPercentage,
          session,
          scheduledFor,
        );
      }
      await Promise.all(
        happyWinners.map((winner) =>
          this.codeService.create(
            {
              userId: winner,
              rewardId: reward._id,
            },
            session,
          ),
        ),
      );
      if (happyWinners.length > 0) {
        await this.notificationService.create({
          title: `Congratulations! You have won a reward!`,
          body: event.place.name,
          eventId: event._id.toString(),
          locationId,
          receivers: happyWinners,
          type: NotificationType.REWARD,
        });
      }
    });
    await session.endSession();
  }

  async create(createRewardDto: CreateRewardDto, uid: string) {
    const { scheduledFor, description, rewardPercentage, eventId } =
      createRewardDto;
    const duplicateEvent = await this.findByEventId(eventId);
    if (duplicateEvent) {
      throw new InternalServerErrorException(
        `This event does already have a reward drawing`,
      );
    }
    const { event, isUserOwner } = await this.eventService.findById(
      eventId,
      uid,
    );
    if (!event) {
      throw new InternalServerErrorException(`Event not found`);
    }
    if (!isUserOwner) {
      throw new InternalServerErrorException(`Illegal operation`);
    }
    if (scheduledFor) {
      const reward = await this.rewardRepository.createReward(
        description,
        eventId,
        rewardPercentage,
        undefined,
        scheduledFor,
      );
      const remindJob = new CronJob(
        subMinutes(new Date(scheduledFor), 5),
        async () => {
          const createNotificationDto = {
            title: `A reward drawing will start in 5 minutes!`,
            body: event.title,
            eventId: event._id.toString(),
            receivers: event.participators.map((u) => u._id),
            type: NotificationType.EVENT_REMINDER,
          };
          const { title, body, receivers } = createNotificationDto;
          const notification = await this.notificationService.create(
            createNotificationDto,
          );
          return this.notificationService.sendNotification(receivers, {
            data: {
              _id: notification._id.toString(),
            },
            notification: {
              title,
              body,
            },
          });
        },
      );
      const createRewardJob = new CronJob(new Date(scheduledFor), async () => {
        this.createRewardWithCodes(
          description,
          event,
          rewardPercentage,
          new Date(scheduledFor),
          reward._id,
        );
      });
      this.schedulerRegistry.addCronJob(new Date().toString(), createRewardJob);
      this.schedulerRegistry.addCronJob(
        addSeconds(new Date(), 1).toString(),
        remindJob,
      );
      createRewardJob.start();
      remindJob.start();
      return;
    }
    await this.createRewardWithCodes(description, event, rewardPercentage);
  }
}
