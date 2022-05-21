import { PartialType } from '@nestjs/mapped-types';
import { IsMongoId } from 'class-validator';
import { CreateEventDto } from './create-event.dto';

export class UpdateEventDto {
  @IsMongoId()
  id: string;
}
