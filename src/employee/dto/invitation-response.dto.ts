import { IsArray, IsMongoId, IsString } from 'class-validator';

export class InvitationResponseDto {
  @IsArray()
  @IsMongoId({ each: true })
  locationIds: string[];
}
