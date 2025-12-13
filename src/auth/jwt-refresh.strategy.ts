import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { CookieOptions, Request } from 'express';
import { RefreshTokenService } from 'src/refresh-token/refresh-token.service';
import { AuthService } from './auth.service';
import { IJWTPayload } from './interfaces/jwt-payload.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private readonly authService: AuthService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          const { refresh_token } = request.cookies;
          return refresh_token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.REFRESH_TOKEN_SECRET,
      passReqToCallback: true,
    });
  }

  async validate(request: Request, payload: IJWTPayload) {
    const refreshToken = request.cookies['refresh_token'];
    await this.refreshTokenService.validateRefreshToken(
      refreshToken,
      payload.uid,
    );
    const userData = await this.authService.refresh(payload.uid);
    const nodeEnv = this.configService.get('NODE_ENV');
    const cookieOptions: CookieOptions = {
      httpOnly: true,
      sameSite: 'strict',
      secure: nodeEnv === 'development' ? false : true,
    };
    request.res.cookie('access_token', userData.access_token, cookieOptions);
    request.res.cookie('refresh_token', userData.refresh_token, cookieOptions);
    return userData;
  }
}
