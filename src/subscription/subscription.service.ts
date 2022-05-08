import { Injectable, InternalServerErrorException } from '@nestjs/common';
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

  async find(subscriptionFilterQuery: SubscriptionFilterQuery) {
    const { userId, locationId } = subscriptionFilterQuery;
    if (userId && locationId) {
      return this.findByUserIdAndLocationId(userId, locationId);
    }
    if (userId) {
      return this.subscriptionRepository.findByUserId(userId);
    }
    return this.subscriptionRepository.findByLocationId(locationId);
  }
}
