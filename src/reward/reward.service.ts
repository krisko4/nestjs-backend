import { StatisticsFilterQuery } from './queries/statistics-filter.query';
import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
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
import { addSeconds, isBefore, subMinutes } from 'date-fns';

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

  async find(rewardFilterQuery: RewardFilterQuery, uid: string) {
    const { eventId, userId } = rewardFilterQuery;
    if (userId && uid.toString() !== userId.toString()) {
      throw new UnauthorizedException('INVALID_USER_ID');
    }
    if (userId && eventId) {
      return this.findByUserIdAndEventId(userId, eventId);
    }
    if (userId) {
      return this.findByUserId(userId);
    }
    if (eventId) {
      return this.findByEventId(eventId);
    }
  }

  private findByUserIdAndEventId(uid: string, eventId: string) {
    return this.rewardRepository.findByUserIdAndEventId(uid, eventId);
  }

  findByEventId(eventId: string) {
    console.log(eventId);
    return this.rewardRepository.findByEventId(eventId);
  }

  findByUserId(userId: string) {
    return this.rewardRepository.findByUserId(userId);
  }

  private async createRewardWithCodes(
    description: string,
    event: Event,
    authorizedParticipatorsIds: string[],
    rewardPercentage: number,
    scheduledFor?: Date,
    rewardId?: string,
  ) {
    const { _id: eventId, locationId } = event;
    const winnersAmount = Math.ceil(
      rewardPercentage * 0.01 * authorizedParticipatorsIds.length,
    );
    const shuffled = [...authorizedParticipatorsIds].sort(
      () => 0.5 - Math.random(),
    );
    const happyWinners = shuffled.slice(0, winnersAmount);
    // const happyWinners = await this.subscriptionService.drawWinners(
    //   rewardPercentage,
    //   locationId,
    //   authorizedParticipators
    // );

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
          authorizedParticipatorsIds,
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
        const createNotificationDto = {
          title: `Congratulations🥳 You have won a reward!💰`,
          body: `Event: ${event.title}\nClick to view your special code🤫`,
          eventId: event._id.toString(),
          locationId,
          receivers: happyWinners,
          type: NotificationType.REWARD,
        };
        const notification = await this.notificationService.create(
          createNotificationDto,
          session,
        );
        const { receivers, body } = createNotificationDto;
        await this.notificationService.sendNotification(receivers, {
          data: {
            _id: notification._id.toString(),
          },
          notification: {
            title: createNotificationDto.title,
            body,
          },
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
        `REWARD_DRAWING_ALREADY_SPECIFIED`,
      );
    }
    const { event, isUserOwner } = await this.eventService.findById(
      eventId,
      uid,
    );
    if (!event) {
      throw new InternalServerErrorException(`EVENT_NOT_FOUND`);
    }
    if (!isUserOwner) {
      throw new InternalServerErrorException(`ILLEGAL_OPERATION`);
    }
    if (isBefore(new Date(event.endDate), new Date())) {
      throw new InternalServerErrorException(`EVENT_HAS_ENDED`);
    }
    const authorizedParticipatorsIds = event.participators
      .filter((p) => p.isSubscriber)
      .map((p) => p.user._id);
    if (scheduledFor) {
      if (isBefore(new Date(scheduledFor), new Date())) {
        throw new InternalServerErrorException(
          `REWARD_DRAWING_SCHEDULED_FOR_THE_PAST`,
        );
      }
      const reward = await this.rewardRepository.createReward(
        description,
        eventId,
        authorizedParticipatorsIds,
        rewardPercentage,
        undefined,
        scheduledFor,
      );
      const remindJob = new CronJob(
        subMinutes(new Date(scheduledFor), 5),
        async () => {
          const createNotificationDto = {
            title: `A reward drawing starts in 5 minutes! ⏰`,
            body: `Event: ${event.title}\nFingers crossed 🤞🤞`,
            eventId: event._id.toString(),
            receivers: event.participators.map((u) => u.user._id),
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
          authorizedParticipatorsIds,
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
    await this.createRewardWithCodes(
      description,
      event,
      authorizedParticipatorsIds,
      rewardPercentage,
    );
  }

  async findStatistics(query: StatisticsFilterQuery) {
    const { locationId } = query;
    const events = await this.eventService.findByLocationId(locationId);
    const eventsIds = events.map((e) => e._id);
    const rewards = await this.rewardRepository.findByEventsIds(eventsIds);
    const rewardsIds = rewards.map((r) => r._id);
    const codes = await this.codeService.findByRewardsIds(rewardsIds);
    console.log(codes);
    return rewards.map((r) => {
      const rewardCodes = codes.filter(
        (c) => c.reward.toString() === r._id.toString(),
      );
      const allCodes = rewardCodes.length;
      const usedCodes = rewardCodes.filter((c) => c.isUsed).length;
      return {
        eventName: r.event.title,
        allCodes,
        usedCodes,
        participatorsCount: r.participators.length,
      };
    });
  }
}
