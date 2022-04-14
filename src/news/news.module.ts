import { Module } from '@nestjs/common';
import { NewsService } from './news.service';
import { NewsController } from './news.controller';
import { News, NewsSchema } from './schemas/news.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { NewsRepository } from './news.repository';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: News.name, schema: NewsSchema }]),
  ],
  controllers: [NewsController],
  providers: [NewsService, NewsRepository],
})
export class NewsModule {}
