import { Injectable } from '@nestjs/common';
import { CreateVisitDto } from './dto/create-visit.dto';
import { VisitRepository } from './visit.repository';

@Injectable()
export class VisitService {
  constructor(private readonly visitRepository: VisitRepository) {}
  create(createVisitDto: CreateVisitDto) {
    return this.visitRepository.create({ ...createVisitDto, date: new Date() });
  }

  findAll() {
    return this.visitRepository.find();
  }

  async findByLocationId(locationId: string) {
    return this.visitRepository.findByLocationId(locationId);
  }
}
