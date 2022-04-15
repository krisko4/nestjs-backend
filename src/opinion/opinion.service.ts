import { Injectable, NotFoundException } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { CreateOpinionDto } from './dto/create-opinion.dto';
import { UpdateOpinionDto } from './dto/update-opinion.dto';
import { OpinionRepository } from './opinion.repository';

@Injectable()
export class OpinionService {
  constructor(
    private readonly opinionRepository: OpinionRepository,
    private readonly userService: UserService,
  ) {}
  async create(createOpinionDto: CreateOpinionDto) {
    const { authorId, locationId, note, content } = createOpinionDto;
    const user = await this.userService.findById(authorId);
    console.log(user);
    if (!user)
      throw new NotFoundException(`User with id: ${authorId} not found`);
    return this.opinionRepository.create({
      locationId,
      note,
      author: user._id,
      content,
    });
  }

  async findByLocationId(locationId: string) {
    return this.opinionRepository.findAndSort(
      { locationId: locationId },
      { date: -1 },
    );
  }

  findAll() {
    return `This action returns all opinion`;
  }

  findOne(id: number) {
    return `This action returns a #${id} opinion`;
  }

  update(id: number, updateOpinionDto: UpdateOpinionDto) {
    return `This action updates a #${id} opinion`;
  }

  remove(id: number) {
    return `This action removes a #${id} opinion`;
  }
}
