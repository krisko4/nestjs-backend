import { BadRequestException, Injectable } from '@nestjs/common';
import { PlaceService } from 'src/place/place.service';
import { CreateVisitDto } from './dto/create-visit.dto';
import { FindVisitsQuery } from './queries/find-visits.query';
import { VisitRepository } from './visit.repository';

@Injectable()
export class VisitService {
  constructor(
    private readonly visitRepository: VisitRepository,
    private readonly placeService: PlaceService,
  ) {}
  create(createVisitDto: CreateVisitDto) {
    return this.visitRepository.create({ ...createVisitDto, date: new Date() });
  }

  findAll() {
    return this.visitRepository.find();
  }

  private async findAllByUserId(uid: string) {
    const locationIds = await this.placeService.findLocationIdsByUserId(uid);
    return this.visitRepository.findByLocationIds(locationIds);
  }

  private async findByLocationId(locationId: string) {
    return this.visitRepository.findByLocationId(locationId);
  }

  async findByQuery(findVisitsQuery: FindVisitsQuery) {
    const { locationId, uid } = findVisitsQuery;
    if (locationId && uid)
      throw new BadRequestException('Only one query param is allowed');
    if (uid) {
      return this.findAllByUserId(uid);
    }
    return this.findByLocationId(locationId);
  }
}
