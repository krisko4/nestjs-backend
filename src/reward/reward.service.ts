import { StatisticsFilterQuery } from './queries/statistics-filter.query';
import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
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
import { PlaceService } from 'src/place/place.service';
import { PaginationQuery } from './queries/pagination.query';
import { ActivateRewardDto } from './dto/activate-reward.dto';
import { PlaceEmployeeRole } from 'src/place/schemas/place-employee.schema';
import { SearchRewardQuery } from './queries/search-reward.query';

@Injectable()
export class RewardService {
  constructor(
    private readonly rewardRepository: RewardRepository,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly eventService: EventService,
    private readonly subscriptionService: SubscriptionService,
    private readonly codeService: CodeService,
    private readonly notificationService: NotificationService,
    private readonly placeService: PlaceService,
    @InjectConnection() private readonly connection: mongoose.Connection,
  ) {}

  async find(rewardFilterQuery: RewardFilterQuery, uid: string) {
    const { eventId } = rewardFilterQuery;
    if (eventId) {
      return this.findByUserIdAndEventId(uid, eventId);
    }
    return this.findByUserId(
      {
        start: rewardFilterQuery.start,
        limit: rewardFilterQuery.limit,
      },
      uid,
    );
    // if (eventId) {
    //   return this.findByEventId(eventId);
    // }
  }

  private findByUserIdAndEventId(uid: string, eventId: string) {
    return this.rewardRepository.findByUserIdAndEventId(uid, eventId);
  }

  findById(id: string) {
    return this.rewardRepository.findById(id);
  }

  async findByIdForUser(id: string, userId: string) {
    const reward = await this.rewardRepository.findById(id);
    const code = await this.codeService.findByRewardIdAndUserId(id, userId);
    return {
      ...reward.toObject(),
      usedAt: code ? code.usedAt : null,
    };
  }

  findByEventId(eventId: string) {
    return this.rewardRepository.findByEventId(eventId);
  }

  findByUserId(paginationQuery: PaginationQuery, userId: string) {
    return this.rewardRepository.findByUserId(paginationQuery, userId);
  }

  async activateReward(activateRewardDto: ActivateRewardDto, userId: string) {
    const { rewardId } = activateRewardDto;
    const reward = await this.findById(rewardId);
    if (!reward) {
      throw new NotFoundException('INVALID_REWARD_ID');
    }

    // Sprawdź czy użytkownik ma dostęp do tego rewarda
    if (
      reward.availableFor === 'SELECTED_USERS' &&
      reward.selectedUserIds &&
      reward.selectedUserIds.length > 0
    ) {
      const hasAccess = reward.selectedUserIds.some(
        (id) => id.toString() === userId.toString(),
      );
      if (!hasAccess) {
        throw new UnauthorizedException(
          'You do not have access to this reward',
        );
      }
    }

    const existingCode = await this.codeService.findByRewardIdAndUserId(
      rewardId,
      userId,
    );

    if (existingCode && !existingCode.usedAt) {
      return {
        code: existingCode.value,
      };
    }

    const code = await this.codeService.create({
      userId,
      rewardId,
    });
    return {
      code: code.value,
    };
  }

  async deleteById(id: string, uid: string) {
    const reward = await this.findById(id);
    if (!reward) {
      throw new NotFoundException('INVALID_REWARD_ID');
    }
    const isUserBoss = reward.place.employees.some(
      (u) =>
        u.user.toString() === uid.toString() &&
        u.role === PlaceEmployeeRole.BOSS,
    );
    if (!isUserBoss) {
      throw new UnauthorizedException('ILLEGAL_OPERATION');
    }
    const session = await this.connection.startSession();
    await session.withTransaction(async () => {
      await Promise.all([
        this.rewardRepository.findByIdAndDelete(id, session),
        this.codeService.findByRewardIdAndDelete(id, session),
      ]);
    });
    await session.endSession();
    return true;
  }

  // private async createRewardWithCodes(
  //   description: string,
  //   event: Event,
  //   authorizedParticipatorsIds: string[],
  //   rewardPercentage: number,
  //   scheduledFor?: Date,
  //   rewardId?: string,
  // ) {
  //   const { _id: eventId, locationId } = event;
  //   const winnersAmount = Math.ceil(
  //     rewardPercentage * 0.01 * authorizedParticipatorsIds.length,
  //   );
  //   const shuffled = [...authorizedParticipatorsIds].sort(
  //     () => 0.5 - Math.random(),
  //   );
  //   const happyWinners = shuffled.slice(0, winnersAmount);
  //   // const happyWinners = await this.subscriptionService.drawWinners(
  //   //   rewardPercentage,
  //   //   locationId,
  //   //   authorizedParticipators
  //   // );

  //   const session = await this.connection.startSession();
  //   await session.withTransaction(async () => {
  //     let reward: RewardDocument;
  //     if (rewardId) {
  //       reward = await this.rewardRepository.findByIdAndUpdate(
  //         rewardId,
  //         {
  //           description,
  //           eventId,
  //           rewardPercentage,
  //           date: new Date(),
  //         },
  //         session,
  //       );
  //     } else {
  //       reward = await this.rewardRepository.createReward(
  //         description,
  //         eventId,
  //         authorizedParticipatorsIds,
  //         rewardPercentage,
  //         session,
  //         scheduledFor,
  //       );
  //     }
  //     await Promise.all(
  //       happyWinners.map((winner) =>
  //         this.codeService.create(
  //           {
  //             userId: winner,
  //             rewardId: reward._id,
  //           },
  //           session,
  //         ),
  //       ),
  //     );
  //     if (happyWinners.length > 0) {
  //       const createNotificationDto = {
  //         title: `Congratulations🥳 You have won a reward!💰`,
  //         body: `Event: ${event.title}\nClick to view your special code🤫`,
  //         eventId: event._id.toString(),
  //         locationId,
  //         receivers: happyWinners,
  //         type: NotificationType.REWARD,
  //       };
  //       const notification = await this.notificationService.create(
  //         createNotificationDto,
  //         session,
  //       );
  //       const { receivers, body } = createNotificationDto;
  //       await this.notificationService.sendNotification(receivers, {
  //         data: {
  //           _id: notification._id.toString(),
  //         },
  //         notification: {
  //           title: createNotificationDto.title,
  //           body,
  //         },
  //       });
  //     }
  //   });
  //   await session.endSession();
  // }

  async create(createRewardDto: CreateRewardDto, uid: string) {
    const {
      description,
      eventId,
      name,
      locationId,
      availableFor,
      selectedUserIds,
    } = createRewardDto;
    const duplicateEvent = await this.findByEventId(eventId);
    if (duplicateEvent) {
      throw new InternalServerErrorException(
        `REWARD_DRAWING_ALREADY_SPECIFIED`,
      );
    }
    if (eventId) {
      const event = await this.eventService.findById(eventId);
      if (isBefore(new Date(event.endDate), new Date())) {
        throw new InternalServerErrorException(`EVENT_HAS_ENDED`);
      }
    }
    const place = await this.placeService.findByLocationId(locationId);
    const isUserOwner = place.employees.some(
      (u) =>
        u.user.toString() === uid.toString() &&
        u.role === PlaceEmployeeRole.BOSS,
    );
    if (!isUserOwner) {
      throw new InternalServerErrorException(`ILLEGAL_OPERATION`);
    }
    // const authorizedParticipatorsIds = event.participators
    //   .filter((p) => p.isSubscriber)
    //   .map((p) => p.user._id);
    // if (scheduledFor) {
    //   if (isBefore(new Date(scheduledFor), new Date())) {
    //     throw new InternalServerErrorException(
    //       `REWARD_DRAWING_SCHEDULED_FOR_THE_PAST`,
    //     );
    //   }
    //   const reward = await this.rewardRepository.createReward(
    //     description,
    //     eventId,
    //     authorizedParticipatorsIds,
    //     rewardPercentage,
    //     undefined,
    //     scheduledFor,
    //   );
    //   const remindJob = new CronJob(
    //     subMinutes(new Date(scheduledFor), 5),
    //     async () => {
    //       const createNotificationDto = {
    //         title: `A reward drawing starts in 5 minutes! ⏰`,
    //         body: `Event: ${event.title}\nFingers crossed 🤞🤞`,
    //         eventId: event._id.toString(),
    //         receivers: event.participators.map((u) => u.user._id),
    //         type: NotificationType.EVENT_REMINDER,
    //       };
    //       const { title, body, receivers } = createNotificationDto;
    //       const notification = await this.notificationService.create(
    //         createNotificationDto,
    //       );
    //       return this.notificationService.sendNotification(receivers, {
    //         data: {
    //           _id: notification._id.toString(),
    //         },
    //         notification: {
    //           title,
    //           body,
    //         },
    //       });
    //     },
    //   );
    //   const createRewardJob = new CronJob(new Date(scheduledFor), async () => {
    //     this.createRewardWithCodes(
    //       description,
    //       event,
    //       authorizedParticipatorsIds,
    //       rewardPercentage,
    //       new Date(scheduledFor),
    //       reward._id,
    //     );
    //   });
    //   this.schedulerRegistry.addCronJob(new Date().toString(), createRewardJob);
    //   this.schedulerRegistry.addCronJob(
    //     addSeconds(new Date(), 1).toString(),
    //     remindJob,
    //   );
    //   createRewardJob.start();
    //   remindJob.start();
    //   return;
    // }

    const session = await this.connection.startSession();

    this.rewardRepository.createReward({
      name,
      description,
      eventId,
      session,
      availableFor,
      placeId: place._id,
      locationId,
      selectedUserIds,
    });

    // await this.createRewardWithCodes(
    //   description,
    //   event,
    //   authorizedParticipatorsIds,
    //   rewardPercentage,
    // );
  }

  async search(searchQuery: SearchRewardQuery) {
    const { lat, lng, countryCode, start, limit } = searchQuery;

    const nearbyLocationIds =
      await this.placeService.findLocationIdsWithinRadius(
        lat,
        lng,
        15000, // 15 km in metres
      );

    if (nearbyLocationIds.length > 0) {
      return this.rewardRepository.findPaginatedByLocationIds(
        { start, limit },
        nearbyLocationIds,
      );
    }

    return this.rewardRepository.findPaginatedByCountryCode(
      { start, limit },
      countryCode,
    );
  }

  async findStatistics(query: StatisticsFilterQuery) {
    const { locationId } = query;
    const events = await this.eventService.findByLocationId(locationId);
    const eventsIds = events.map((e) => e._id);
    const rewards = await this.rewardRepository.findByEventsIds(eventsIds);
    const rewardsIds = rewards.map((r) => r._id);
    const codes = await this.codeService.findByRewardsIds(rewardsIds);
    return rewards.map((r) => {
      const rewardCodes = codes.filter(
        (c) => c.reward.toString() === r._id.toString(),
      );
      const allCodes = rewardCodes.length;
      const usedCodes = rewardCodes.filter((c) => c.usedAt).length;
      return {
        eventName: r.event.title,
        allCodes,
        usedCodes,
        // participatorsCount: r.participators.length,
      };
    });
  }

  /**
   * Pobiera historię skanów dla konkretnego rewarda (dla admina)
   * @param rewardId - ID rewarda
   * @param userId - ID użytkownika (właściciela place'a)
   * @param start - Offset (skip)
   * @param limit - Liczba elementów na stronę
   */
  async getRewardScanHistory(
    rewardId: string,
    userId: string,
    start: number = 0,
    limit: number = 10,
  ) {
    // Sprawdź czy reward istnieje i czy użytkownik ma do niego dostęp
    const reward = await this.findById(rewardId);
    if (!reward) {
      throw new NotFoundException('INVALID_REWARD_ID');
    }

    // Sprawdź czy użytkownik jest właścicielem place'a
    const isUserBoss = reward.place.employees.some(
      (u) =>
        u.user.toString() === userId.toString() &&
        u.role === PlaceEmployeeRole.BOSS,
    );
    if (!isUserBoss) {
      throw new UnauthorizedException('ILLEGAL_OPERATION');
    }

    // Pobierz historię skanów
    return this.codeService.findScanHistoryByRewardId(rewardId, start, limit);
  }
}
