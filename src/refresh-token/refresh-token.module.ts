import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RefreshTokenService } from 'src/refresh-token/refresh-token.service';
import {
  RefreshToken,
  RefreshTokenSchema,
} from 'src/refresh-token/schemas/refresh-token.schema';
import { RefreshTokenRepository } from './refresh-token.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RefreshToken.name, schema: RefreshTokenSchema },
    ]),
  ],
  providers: [RefreshTokenRepository, RefreshTokenService],
  exports: [RefreshTokenService],
})
export class RefreshTokenModule {}
