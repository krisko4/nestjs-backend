import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { NewsService } from './news.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Post()
  createNews(@Body() createNewsDto: CreateNewsDto) {
    return this.newsService.createNews(createNewsDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.newsService.findAll();
  }

  @Get('/search')
  findByLocationId(@Query('locationId') locationId: string) {
    return this.newsService.findByLocationId(locationId);
  }
}
