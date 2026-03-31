import { StatisticsFilterQuery } from './queries/statistics-filter.query';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CreateRewardDto } from './dto/create-reward.dto';
import { UpdateRewardDto } from './dto/update-reward.dto';
import { RewardFilterQuery } from './queries/reward-filter.query';
import { RewardRepository } from './reward.repository';
import mongoose from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { CodeService } from 'src/code/code.service';
import { EventService } from 'src/event/event.service';
import {
  RewardAvailableFor,
  RewardDocument,
  RewardStatus,
} from './schemas/reward.schema';
import { NotificationService } from 'src/notification/notification.service';
import { NotificationType } from 'src/notification/schemas/notification.schema';
import { isBefore } from 'date-fns';
import { PlaceService } from 'src/place/place.service';
import { PaginationQuery } from './queries/pagination.query';
import { ActivateRewardDto } from './dto/activate-reward.dto';
import { SearchRewardQuery } from './queries/search-reward.query';
import { UserService } from 'src/user/user.service';
import { EmployeeService } from 'src/employee/employee.service';
import { UserRewardsQuery } from './queries/user-rewards.query';

@Injectable()
export class RewardService {
  constructor(
    private readonly rewardRepository: RewardRepository,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly eventService: EventService,
    private readonly codeService: CodeService,
    private readonly notificationService: NotificationService,
    private readonly placeService: PlaceService,
    private readonly userService: UserService,
    private readonly employeeService: EmployeeService,
    @InjectConnection() private readonly connection: mongoose.Connection,
  ) {}

  async find(rewardFilterQuery: RewardFilterQuery, uid: string) {
    const { eventId, placeId, status } = rewardFilterQuery;
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
      placeId,
    );
  }

  private findByUserIdAndEventId(uid: string, eventId: string) {
    return this.rewardRepository.findByUserIdAndEventId(uid, eventId);
  }

  findById(id: string) {
    return this.rewardRepository.findById(id);
  }

  async findByIdForUser(id: string, userId: string) {
    const reward = (await this.rewardRepository.findById(id)).toObject();
    if (!reward) {
      throw new NotFoundException('INVALID_REWARD_ID');
    }

    const code = await this.codeService.findByRewardIdAndUserId(id, userId);

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
      availableFor: reward.availableFor,
      description: reward.description,
      createdAt: reward.createdAt,
      usedAt: code ? code.usedAt : null,
      usageLimit: reward.usageLimit,
      usedCount,
      locations: locationsWithFavoriteStatus,
      place: {
        _id: reward.place._id,
        name: reward.place.name,
        logo: reward.place.logo,
        locations: reward.place.locations,
      },
    };
  }

  findByEventId(eventId: string) {
    return this.rewardRepository.findByEventId(eventId);
  }

  async findByUserId(
    paginationQuery: PaginationQuery,
    userId: string,
    status?: RewardStatus,
    placeId?: string,
  ) {
    const result = await this.rewardRepository.findByUserId(
      paginationQuery,
      userId,
      status,
      placeId,
    );

    return result;
  }

  async activateReward(activateRewardDto: ActivateRewardDto, userId: string) {
    const { rewardId, locationId } = activateRewardDto;
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
      locationId,
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
    const isUserBoss = await this.employeeService.isUserBossOfPlace(
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
      userLimit,
      usageLimit,
      lastScanDate,
    } = createRewardDto;

    const place = await this.placeService.findByLocationId(locationIds[0]);

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

    for (const locationId of locationIds) {
      const isBoss = await this.employeeService.isUserBossOfLocation(
        uid,
        locationId,
      );
      if (!isBoss) {
        throw new UnauthorizedException(`ILLEGAL_OPERATION`);
      }
    }

    let selectedUserIds = createRewardDto.selectedUserIds;

    if (
      availableFor === RewardAvailableFor.TOP_ACTIVE_USERS &&
      userLimit &&
      userLimit > 0
    ) {
      selectedUserIds = await this.getTopActiveUsers(
        place._id.toString(),
        locationIds,
        userLimit,
      );
    } else if (
      availableFor === RewardAvailableFor.LEAST_ACTIVE_USERS &&
      userLimit &&
      userLimit > 0
    ) {
      selectedUserIds = await this.getLeastActiveUsers(
        place._id.toString(),
        locationIds,
        userLimit,
      );
    } else if (availableFor === RewardAvailableFor.CURRENT_CLIENTS) {
      selectedUserIds = await this.getAllClients(
        place._id.toString(),
        locationIds,
      );
    } else if (availableFor === RewardAvailableFor.CURRENT_SUBSCRIBERS) {
      selectedUserIds = await this.getAllSubscribers(locationIds);
    } else if (availableFor === RewardAvailableFor.INACTIVE && lastScanDate) {
      selectedUserIds = await this.getInactiveClients(
        place._id.toString(),
        locationIds,
        lastScanDate,
      );
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
        userLimit,
        usageLimit,
        lastScanDate,
      });
    });

    await session.endSession();

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
            locationId: locationIds[0],
            rewardId,
          },
        );
      }
    } catch (error) {
      console.error('Error sending reward notifications:', error);
    }
  }

  async search(searchQuery: SearchRewardQuery, userId: string) {
    const { lat, lng, countryCode, start, limit } = searchQuery;

    const nearbyLocationIds =
      await this.placeService.findLocationIdsWithinRadius(lat, lng, 30000);

    const favoriteLocationIds = await this.userService.getFavoriteLocationIds(
      userId,
    );

    const clientPlaceIds = await this.codeService.getPlacesByClientId(userId);

    if (nearbyLocationIds.length > 0) {
      return this.rewardRepository.findPaginatedByLocationIds(
        { start, limit },
        nearbyLocationIds,
        userId,
        favoriteLocationIds,
        clientPlaceIds,
      );
    }

    return {
      metadata: [
        {
          total: 0,
          start,
          limit,
        },
      ],
      data: [],
    };

    // return this.rewardRepository.findPaginatedByCountryCode(
    //   { start, limit },
    //   countryCode,
    //   userId,
    //   favoriteLocationIds,
    //   clientPlaceIds,
    // );
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

  async getRewardScanHistory(
    rewardId: string,
    userId: string,
    start: number = 0,
    limit: number = 10,
  ) {
    const reward = await this.findById(rewardId);
    if (!reward) {
      throw new NotFoundException('INVALID_REWARD_ID');
    }

    // Sprawdź czy użytkownik jest właścicielem place'a (BOSS'em)
    const isUserBoss = await this.employeeService.isUserBossOfPlace(
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
    const isUserBoss = await this.employeeService.isUserBossOfPlace(
      uid,
      reward.place._id.toString(),
    );
    if (!isUserBoss) {
      throw new UnauthorizedException('ILLEGAL_OPERATION');
    }

    const { locationIds, eventId, availableFor, userLimit, lastScanDate } =
      updateRewardDto;
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
          this.employeeService.isUserBossOfLocation(uid, locationId),
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

    // Automatyczne przypisanie użytkowników na podstawie aktywności przy zmianie availableFor lub userLimit
    const finalAvailableFor = availableFor || reward.availableFor;
    const finalUserLimit = userLimit || reward.userLimit;
    const finalLocationIds =
      locationIds || reward.locationIds.map((id) => id.toString());

    if (
      (availableFor === RewardAvailableFor.TOP_ACTIVE_USERS ||
        (availableFor === undefined &&
          reward.availableFor === RewardAvailableFor.TOP_ACTIVE_USERS)) &&
      finalUserLimit &&
      finalUserLimit > 0
    ) {
      updateData.selectedUserIds = await this.getTopActiveUsers(
        reward.place._id.toString(),
        finalLocationIds,
        finalUserLimit,
      );
    } else if (
      (availableFor === RewardAvailableFor.LEAST_ACTIVE_USERS ||
        (availableFor === undefined &&
          reward.availableFor === RewardAvailableFor.LEAST_ACTIVE_USERS)) &&
      finalUserLimit &&
      finalUserLimit > 0
    ) {
      updateData.selectedUserIds = await this.getLeastActiveUsers(
        reward.place._id.toString(),
        finalLocationIds,
        finalUserLimit,
      );
    } else if (
      availableFor === RewardAvailableFor.CURRENT_CLIENTS ||
      (availableFor === undefined &&
        reward.availableFor === RewardAvailableFor.CURRENT_CLIENTS)
    ) {
      updateData.selectedUserIds = await this.getAllClients(
        reward.place._id.toString(),
        finalLocationIds,
      );
    } else if (
      availableFor === RewardAvailableFor.CURRENT_SUBSCRIBERS ||
      (availableFor === undefined &&
        reward.availableFor === RewardAvailableFor.CURRENT_SUBSCRIBERS)
    ) {
      updateData.selectedUserIds = await this.getAllSubscribers(
        finalLocationIds,
      );
    } else if (
      (availableFor === RewardAvailableFor.INACTIVE ||
        (availableFor === undefined &&
          reward.availableFor === RewardAvailableFor.INACTIVE)) &&
      (lastScanDate || reward.lastScanDate)
    ) {
      const finalLastScanDate = lastScanDate || reward.lastScanDate;
      updateData.selectedUserIds = await this.getInactiveClients(
        reward.place._id.toString(),
        finalLocationIds,
        finalLastScanDate,
      );
    } else if (
      updateRewardDto.selectedUserIds &&
      updateRewardDto.selectedUserIds.length > 0
    ) {
      // Przekształć selectedUserIds jeśli istnieją i nie są automatycznie generowane
      updateData.selectedUserIds = updateRewardDto.selectedUserIds;
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
    const isUserBoss = await this.employeeService.isUserBossOfPlace(
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

  async countActiveByPlaceIds(placeIds: string[]): Promise<number> {
    return this.rewardRepository.countByPlaceIds(placeIds, RewardStatus.ACTIVE);
  }

  private async getTopActiveUsers(
    placeId: string,
    locationIds: string[],
    limit: number,
  ): Promise<string[]> {
    return this.codeService.findTopActiveUsersByPlace(
      placeId,
      locationIds,
      limit,
    );
  }

  private async getLeastActiveUsers(
    placeId: string,
    locationIds: string[],
    limit: number,
  ): Promise<string[]> {
    return this.codeService.findLeastActiveUsersByPlace(
      placeId,
      locationIds,
      limit,
    );
  }

  private async getAllClients(
    placeId: string,
    locationIds: string[],
  ): Promise<string[]> {
    return this.codeService.findAllClientsByPlace(placeId, locationIds);
  }

  private async getInactiveClients(
    placeId: string,
    locationIds: string[],
    lastScanDate: string,
  ): Promise<string[]> {
    return this.codeService.findInactiveClientsByPlace(
      placeId,
      locationIds,
      lastScanDate,
    );
  }

  private async getAllSubscribers(locationIds: string[]): Promise<string[]> {
    const uniqueUserIds = new Set<string>();

    for (const locationId of locationIds) {
      const usersWithFavoriteLocation =
        await this.userService.findUsersByFavoriteLocation(locationId);

      usersWithFavoriteLocation.forEach((user) => {
        uniqueUserIds.add(user._id.toString());
      });
    }

    return Array.from(uniqueUserIds);
  }
}
