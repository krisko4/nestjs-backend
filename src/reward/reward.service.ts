import { StatisticsFilterQuery } from './queries/statistics-filter.query';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { SubscriptionService } from 'src/subscription/subscription.service';
import { CreateRewardDto } from './dto/create-reward.dto';
import { UpdateRewardDto } from './dto/update-reward.dto';
import { RewardFilterQuery } from './queries/reward-filter.query';
import { RewardRepository } from './reward.repository';
import mongoose from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { CodeService } from 'src/code/code.service';
import { EventService } from 'src/event/event.service';
import { RewardDocument, RewardStatus } from './schemas/reward.schema';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationType } from 'src/notification/schemas/notification.schema';
import { isBefore } from 'date-fns';
import { PlaceService } from 'src/place/place.service';
import { PaginationQuery } from './queries/pagination.query';
import { ActivateRewardDto } from './dto/activate-reward.dto';
import { SearchRewardQuery } from './queries/search-reward.query';
import { UserService } from 'src/user/user.service';
import { PlaceEmployeeService } from 'src/place-employee/place-employee.service';
import { UserRewardsQuery } from './queries/user-rewards.query';

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
    private readonly userService: UserService,
    private readonly placeEmployeeService: PlaceEmployeeService,
    @InjectConnection() private readonly connection: mongoose.Connection,
  ) {}

  async find(rewardFilterQuery: RewardFilterQuery, uid: string) {
    const { eventId, status } = rewardFilterQuery;
    if (eventId) {
      return this.findByUserIdAndEventId(uid, eventId);
    }
    return this.findByUserId(
      {
        start: rewardFilterQuery.start,
        limit: rewardFilterQuery.limit,
      },
      uid,
      status,
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
    if (!reward) {
      throw new NotFoundException('INVALID_REWARD_ID');
    }

    const code = await this.codeService.findByRewardIdAndUserId(id, userId);

    // Znajdź wszystkie lokalizacje powiązane z rewardem
    const locations = reward.place.locations.filter((loc) =>
      reward.locationIds.some(
        (locationId) => locationId.toString() === loc._id.toString(),
      ),
    );

    if (!locations || locations.length === 0) {
      throw new NotFoundException('Locations not found for this reward');
    }

    const favoriteLocationIds = await this.userService.getFavoriteLocationIds(
      userId,
    );

    const locationsWithFavoriteStatus = locations.map((location) => ({
      _id: location._id,
      address: location.address,
      isFavorite: favoriteLocationIds.includes(location._id.toString()),
    }));

    const usedCount = await this.codeService.countUserRewardUsage(id, userId);

    return {
      _id: reward._id,
      name: reward.name,
      description: reward.description,
      createdAt: reward.createdAt,
      usedAt: code ? code.usedAt : null,
      usageLimit: reward.usageLimit,
      usedCount,
      place: {
        _id: reward.place._id,
        name: reward.place.name,
        logo: reward.place.logo,
        locations: locationsWithFavoriteStatus,
      },
    };
  }

  findByEventId(eventId: string) {
    return this.rewardRepository.findByEventId(eventId);
  }

  async findByUserId(paginationQuery: PaginationQuery, userId: string, status?: RewardStatus) {
    const result = await this.rewardRepository.findByUserId(
      paginationQuery,
      userId,
      status,
    );

    console.log(result);

    if (!result.data || result.data.length === 0) {
      return result;
    }

    const rewardsWithUsageInfo = await Promise.all(
      result.data.map(async (reward) => {
        const usedCount = await this.codeService.countUserRewardUsage(
          reward._id,
          userId,
        );
        return {
          ...reward,
          usedCount,
        };
      }),
    );

    return {
      ...result,
      data: rewardsWithUsageInfo,
    };
  }

  async activateReward(activateRewardDto: ActivateRewardDto, userId: string) {
    const { rewardId } = activateRewardDto;
    const reward = await this.findById(rewardId);
    if (!reward) {
      throw new NotFoundException('INVALID_REWARD_ID');
    }

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

    // Sprawdź czy użytkownik nie przekroczył limitu użyć
    if (reward.usageLimit !== null && reward.usageLimit !== undefined) {
      const usedCount = await this.codeService.countUserRewardUsage(
        rewardId,
        userId,
      );
      if (usedCount >= reward.usageLimit) {
        throw new BadRequestException(
          `You have reached the usage limit for this reward (${reward.usageLimit} times)`,
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

    // Sprawdź czy użytkownik jest BOSS'em tego miejsca
    const isUserBoss = await this.placeEmployeeService.isUserBossOfPlace(
      uid,
      reward.place._id.toString(),
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

  async create(createRewardDto: CreateRewardDto, uid: string) {
    const {
      description,
      eventId,
      name,
      locationIds,
      availableFor,
      selectedUserIds,
      usageLimit,
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

    // Sprawdź czy wszystkie lokalizacje należą do tego samego place
    const place = await this.placeService.findByLocationId(locationIds[0]);

    // Zweryfikuj czy wszystkie locationIds należą do tego samego place
    for (const locationId of locationIds) {
      const locationPlace = await this.placeService.findByLocationId(
        locationId,
      );
      if (locationPlace._id.toString() !== place._id.toString()) {
        throw new InternalServerErrorException(
          'All locations must belong to the same place',
        );
      }
    }

    // Sprawdź czy użytkownik jest BOSS'em przynajmniej jednej z tych lokalizacji
    const hasAccessToAnyLocation = await Promise.all(
      locationIds.map((locationId) =>
        this.placeEmployeeService.isUserBossOfLocation(uid, locationId),
      ),
    );

    if (!hasAccessToAnyLocation.some((hasAccess) => hasAccess)) {
      throw new InternalServerErrorException(`ILLEGAL_OPERATION`);
    }

    const session = await this.connection.startSession();

    let reward: RewardDocument;
    await session.withTransaction(async () => {
      reward = await this.rewardRepository.createReward({
        name,
        description,
        eventId,
        session,
        availableFor,
        placeId: place._id,
        locationIds,
        selectedUserIds,
        usageLimit,
      });
    });

    await session.endSession();

    // Wyślij notyfikacje dla wszystkich lokalizacji
    this.sendRewardNotificationsAsync(
      locationIds,
      place.name,
      name,
      reward._id.toString(),
    );

    return reward;
  }

  private async sendRewardNotificationsAsync(
    locationIds: string[],
    placeName: string,
    rewardName: string,
    rewardId: string,
  ): Promise<void> {
    try {
      // Zbierz użytkowników ze wszystkich lokalizacji (bez duplikatów)
      const uniqueUserIds = new Set<string>();

      for (const locationId of locationIds) {
        const usersWithFavoriteLocation =
          await this.userService.findUsersByFavoriteLocation(locationId);

        usersWithFavoriteLocation.forEach((user) => {
          uniqueUserIds.add(user._id.toString());
        });
      }

      if (uniqueUserIds.size > 0) {
        const receiverIds = Array.from(uniqueUserIds);

        await this.notificationService.createAndSendPersonalizedNotifications(
          NotificationType.REWARD,
          receiverIds,
          {
            placeName: placeName,
            rewardName: rewardName,
          },
          {
            rewardId: rewardId,
            locationIds: locationIds.join(','),
          },
          {
            locationId: locationIds[0], // Użyj pierwszego locationId jako głównego
            rewardId,
          },
        );
      }
    } catch (error) {
      console.error('Error sending reward notifications:', error);
    }
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

    // Sprawdź czy użytkownik jest właścicielem place'a (BOSS'em)
    const isUserBoss = await this.placeEmployeeService.isUserBossOfPlace(
      userId,
      reward.place._id.toString(),
    );
    if (!isUserBoss) {
      throw new UnauthorizedException('ILLEGAL_OPERATION');
    }

    // Pobierz historię skanów
    return this.codeService.findScanHistoryByRewardId(rewardId, start, limit);
  }

  async updateById(id: string, uid: string, updateRewardDto: UpdateRewardDto) {
    const reward = await this.findById(id);
    if (!reward) {
      throw new NotFoundException('INVALID_REWARD_ID');
    }

    // Sprawdź czy użytkownik jest BOSS'em miejsca
    const isUserBoss = await this.placeEmployeeService.isUserBossOfPlace(
      uid,
      reward.place._id.toString(),
    );
    if (!isUserBoss) {
      throw new UnauthorizedException('ILLEGAL_OPERATION');
    }

    const { locationIds, eventId, selectedUserIds } = updateRewardDto;
    const updateData: any = { ...updateRewardDto };

    // Jeśli są nowe locationIds, weryfikujemy czy należą do tego samego place
    if (locationIds && locationIds.length > 0) {
      const place = await this.placeService.findByLocationId(locationIds[0]);

      // Zweryfikuj czy wszystkie locationIds należą do tego samego place
      for (const locationId of locationIds) {
        const locationPlace = await this.placeService.findByLocationId(
          locationId,
        );
        if (locationPlace._id.toString() !== place._id.toString()) {
          throw new BadRequestException(
            'All locations must belong to the same place',
          );
        }
      }

      // Sprawdź czy nowe locationIds należą do tego samego place co obecny reward
      if (place._id.toString() !== reward.place._id.toString()) {
        throw new BadRequestException(
          'Cannot change reward to a different place',
        );
      }

      // Sprawdź czy użytkownik jest BOSS'em przynajmniej jednej z nowych lokalizacji
      const hasAccessToAnyLocation = await Promise.all(
        locationIds.map((locationId) =>
          this.placeEmployeeService.isUserBossOfLocation(uid, locationId),
        ),
      );

      if (!hasAccessToAnyLocation.some((hasAccess) => hasAccess)) {
        throw new UnauthorizedException('ILLEGAL_OPERATION');
      }
    }

    // Jeśli jest nowy eventId, zweryfikuj go
    if (eventId) {
      const event = await this.eventService.findById(eventId);
      if (isBefore(new Date(event.endDate), new Date())) {
        throw new BadRequestException('EVENT_HAS_ENDED');
      }
    }

    // Przekształć selectedUserIds jeśli istnieją
    if (selectedUserIds && selectedUserIds.length > 0) {
      updateData.selectedUserIds = selectedUserIds;
    }

    // Aktualizuj reward
    const updatedReward = await this.rewardRepository.updateReward(
      id,
      updateData,
    );

    return updatedReward;
  }

  async toggleRewardStatus(id: string, uid: string, status: RewardStatus) {
    const reward = await this.findById(id);
    if (!reward) {
      throw new NotFoundException('INVALID_REWARD_ID');
    }

    // Sprawdź czy użytkownik jest BOSS'em miejsca
    const isUserBoss = await this.placeEmployeeService.isUserBossOfPlace(
      uid,
      reward.place._id.toString(),
    );
    if (!isUserBoss) {
      throw new UnauthorizedException('ILLEGAL_OPERATION');
    }

    // Aktualizuj status
    const updatedReward = await this.rewardRepository.updateReward(id, {
      status,
    });

    return updatedReward;
  }
}
