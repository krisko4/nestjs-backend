import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { format, isToday } from 'date-fns';
import { PlaceService } from '../place/place.service';
import { UserService } from '../user/user.service';
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
    return this.findByLocationId(locationId);
  }

  async findByLocationId(locationId: string) {
    const opinions = await this.opinionRepository.findByLocationId(locationId);
    const opinionsToday = opinions.filter((opinion) =>
      isToday(new Date(opinion.date)),
    ).length;
    return {
      today: opinionsToday,
      opinions: opinions.map((opinion) => {
        return {
          date: format(opinion.date, 'yyyy-MM-dd HH:mm:ss'),
          note: opinion.note,
          content: opinion.content,
          author: `${opinion.author.firstName} ${opinion.author.lastName}`,
          authorImg: `${process.env.CLOUDI_URL}/${opinion.author.img}`,
        };
      }),
    };
  }
}
