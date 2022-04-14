import { IsDateString, IsMongoId, IsString } from 'class-validator';
import { CreateNewsDto } from './create-news.dto';

export class NewsDto extends CreateNewsDto {
  @IsDateString()
  date: Date;
}
