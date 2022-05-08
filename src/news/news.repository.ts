import { InjectModel } from '@nestjs/mongoose';
import { News, NewsDocument } from './schemas/news.schema';
import { Model } from 'mongoose';
import { Injectable } from '@nestjs/common';
import { MongoRepository } from '../database/repository';

@Injectable()
export class NewsRepository extends MongoRepository<NewsDocument> {
  constructor(
    @InjectModel(News.name) private readonly newsModel: Model<NewsDocument>,
  ) {
    super(newsModel);
  }
}
