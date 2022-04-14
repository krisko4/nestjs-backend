import { Injectable } from '@nestjs/common';
import { CreateNewsDto } from './dto/create-news.dto';
import { NewsRepository } from './news.repository';

@Injectable()
export class NewsService {
  constructor(private readonly newsRepository: NewsRepository) {}
  createNews(createNewsDto: CreateNewsDto) {
    return this.newsRepository.create({ ...createNewsDto, date: new Date() });
  }

  findAll() {
    return this.newsRepository.find();
  }

  async findByLocationId(locationId: string) {
    return this.newsRepository.findAndSort(
      { locationId: locationId },
      { date: -1 },
    );
  }
}
