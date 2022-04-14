import { IRepository } from 'src/database/repository';
import {
  ConfirmationToken,
  ConfirmationTokenDocument,
} from './schemas/confirmation.token';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

export class ConfirmationTokenRepository extends IRepository<ConfirmationTokenDocument> {
  constructor(
    @InjectModel(ConfirmationToken.name)
    private readonly confirmationTokenModel: Model<ConfirmationTokenDocument>,
  ) {
    super(confirmationTokenModel);
  }
}
