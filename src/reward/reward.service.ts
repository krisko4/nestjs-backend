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
import { EventDocument } from 'src/event/schemas/event.schema';
import { RewardDocument } from './schemas/reward.schema';

@Injectable()
export class RewardService {
  constructor(
    private readonly rewardRepository: RewardRepository,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly eventService: EventService,
    private readonly subscriptionService: SubscriptionService,
    private readonly codeService: CodeService,
    @InjectConnection() private readonly connection: mongoose.Connection,
  ) {}

  async find(rewardFilterQuery: RewardFilterQuery) {
    const { userId, eventId } = rewardFilterQuery;
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
    event: EventDocument,
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
        console.log(reward);
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
      const job = new CronJob(new Date(scheduledFor), async () => {
        console.log(reward._id);
        this.createRewardWithCodes(
          description,
          event,
          rewardPercentage,
          new Date(scheduledFor),
          reward._id,
        );
      });
      this.schedulerRegistry.addCronJob(new Date().toString(), job);
      job.start();
      return;
    }
    this.createRewardWithCodes(description, event, rewardPercentage);
  }
}
