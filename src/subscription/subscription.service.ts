import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { User } from 'src/user/schemas/user.schema';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { SubscriptionFilterQuery } from './queries/subscription-filter.query';
import { SubscriptionRepository } from './subscription.repository';

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
  ) {}
  async create(createSubscriptionDto: CreateSubscriptionDto) {
    const { userId, locationId } = createSubscriptionDto;
    const duplicateSub = await this.findByUserIdAndLocationId(
      userId,
      locationId,
    );
    if (duplicateSub)
      throw new InternalServerErrorException(
        `User with id: ${userId} is already a subscriber of location with id: ${locationId}`,
      );
    return this.subscriptionRepository.createSubscription(
      createSubscriptionDto,
    );
  }

  private findByUserIdAndLocationId(uid: string, locationId: string) {
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
    if (userId) {
      return this.subscriptionRepository.deleteByUserId(userId);
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
