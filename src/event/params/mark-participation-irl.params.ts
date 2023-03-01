import { IsMongoId } from 'class-validator';

export class MarkParticipationIRLParams {
  @IsMongoId()
  participatorId: string;
  @IsMongoId()
  id: string;
}
