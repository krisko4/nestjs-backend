import { RefreshTokenRepository } from './refresh-token.repository';
import { Types } from 'mongoose';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class RefreshTokenService {
  constructor(
    private readonly refreshTokenRepository: RefreshTokenRepository,
  ) {}

  update(token: string, uid: string) {
    const hashToken = bcrypt.hashSync(token, 10);
    return this.refreshTokenRepository.findOneAndUpdate(
      { user: new Types.ObjectId(uid) },
      { value: hashToken },
    );
  }

  delete(uid: string) {
    return this.refreshTokenRepository.findOneAndDelete({
      user: uid,
    });
  }

  findByUserId(uid: string) {
    return this.refreshTokenRepository.findOne({
      user: new Types.ObjectId(uid),
    });
  }

  async validateRefreshToken(token: string, uid: string) {
    const refreshToken = await this.findByUserId(uid);
    if (!refreshToken) throw new UnauthorizedException();
    const isTokenValid = bcrypt.compareSync(token, refreshToken.value);
    if (!isTokenValid) throw new UnauthorizedException();
    return { uid };
  }
}
