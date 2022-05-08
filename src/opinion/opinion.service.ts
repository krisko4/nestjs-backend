import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlaceService } from 'src/place/place.service';
import { UserService } from 'src/user/user.service';
import { CreateOpinionDto } from './dto/create-opinion.dto';
import { OpinionRepository } from './opinion.repository';
import { FindOpinionsQuery } from './queries/find-opinions.query';

@Injectable()
export class OpinionService {
  constructor(
    private readonly opinionRepository: OpinionRepository,
    private readonly userService: UserService,
    private readonly placeService: PlaceService,
  ) {}
  async create(createOpinionDto: CreateOpinionDto) {
    const { authorId, locationId, note, content } = createOpinionDto;
    const user = await this.userService.findById(authorId);
    if (!user)
      throw new NotFoundException(`User with id: ${authorId} not found`);
    return this.opinionRepository.create({
      locationId,
      note,
      author: user._id,
      content,
    });
  }

  private async findAllByUserId(uid: string) {
    const locationIds = await this.placeService.findLocationIdsByUserId(uid);
    return this.opinionRepository.findByLocationIds(locationIds);
  }

  async findByQuery(findOpinionsQuery: FindOpinionsQuery) {
    const { locationId, uid } = findOpinionsQuery;
    if (locationId && uid)
      throw new BadRequestException('Only one query param is allowed');
    if (uid) {
      return this.findAllByUserId(uid);
    }
  }

  async findByLocationId(locationId: string) {
    return this.opinionRepository.findAndSort(
      { locationId: locationId },
      { date: -1 },
    );
  }
}
