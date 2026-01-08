import { Injectable } from '@nestjs/common';
import { PlaceService } from 'src/place/place.service';
import { CodeService } from 'src/code/code.service';
import { RewardService } from 'src/reward/reward.service';
import { EventService } from 'src/event/event.service';
import { StatisticsResponseDto } from './dto/statistics-response.dto';

@Injectable()
export class StatisticsService {
  constructor(
    private readonly placeService: PlaceService,
    private readonly codeService: CodeService,
    private readonly rewardService: RewardService,
    private readonly eventService: EventService,
  ) {}

  async getStatistics(userId: string): Promise<StatisticsResponseDto> {
    const places = await this.placeService.findByUserId(userId);

    if (!places || places.length === 0) {
      return {
        activeCoupons: 0,
        activeEvents: 0,
        clients: 0,
        places: 0,
      };
    }

    const placeIds = places.map((place) => place._id.toString());

    const [activeCoupons, activeEvents, uniqueClients] = await Promise.all([
      this.rewardService.countActiveByPlaceIds(placeIds),
      this.eventService.countActiveByPlaceIds(placeIds),
      this.getUniqueClientsCount(placeIds),
    ]);

    return {
      activeCoupons,
      activeEvents,
      clients: uniqueClients,
      places: places.length,
    };
  }

  private async getUniqueClientsCount(placeIds: string[]): Promise<number> {
    const { total } = await this.codeService.findClientsByPlaceIds(
      placeIds,
      0,
      1,
    );
    return total;
  }
}
