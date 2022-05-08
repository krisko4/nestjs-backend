import { InjectModel } from '@nestjs/mongoose';
import { MongoRepository } from 'src/database/repository';
import {
  RefreshToken,
  RefreshTokenDocument,
} from './schemas/refresh-token.schema';
import { Model } from 'mongoose';

export class RefreshTokenRepository extends MongoRepository<RefreshTokenDocument> {
  constructor(
    @InjectModel(RefreshToken.name)
    refreshTokenModel: Model<RefreshTokenDocument>,
  ) {
    super(refreshTokenModel);
  }
}
