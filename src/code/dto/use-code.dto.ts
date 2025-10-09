import { IsString } from 'class-validator';

export class UseCodeDto {
  @IsString()
  value: string;
}
