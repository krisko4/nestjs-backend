import { IsBooleanString, IsMongoId, IsOptional } from 'class-validator';

export class NotificationUpdateQuery {
  @IsMongoId()
  receiverId: string;
  @IsBooleanString()
  @IsOptional()
  clicked?: boolean;
  @IsBooleanString()
  @IsOptional()
  received?: boolean;
}
