import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserService } from 'src/user/user.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UserDocument } from 'src/user/schemas/user.schema';
import { RefreshTokenService } from 'src/refresh-token/refresh-token.service';
import { IJWTPayload } from './interfaces/jwt-payload.interface';
import { OAuth2Client } from 'google-auth-library';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client;
  private pendingAuthTokens: Map<
    string,
    { userData: any; expiresAt: number }
  > = new Map();

  constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService,
    @Inject('JwtAccessService')
    private readonly jwtAccessService: JwtService,
    @Inject('JwtRefreshService')
    private readonly jwtRefreshService: JwtService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {
    this.googleClient = new OAuth2Client(
      this.configService.get('GOOGLE_CLIENT_ID'),
    );
  }

  async validateUser(email: string, pass: string): Promise<UserDocument> {
    const user = await this.userService.findByEmail(email);
    if (!user)
      throw new NotFoundException(`User with email: ${email} not found`);
    const isPasswordValid = bcrypt.compareSync(pass, user.password);
    if (!isPasswordValid)
      throw new InternalServerErrorException('Invalid password');
    return user;
  }

  async refresh(uid: string) {
    const user = await this.userService.findById(uid);
    if (!user) throw new NotFoundException(`User with id: ${uid} not found`);
    return this.login(user);
  }

  async logout(uid: string) {
    await this.userService.removeNotificationTokens(uid);
    return this.refreshTokenService.delete(uid);
  }

  async login(user: UserDocument) {
    const payload: IJWTPayload = {
      email: user.email,
      uid: user._id.toString(),
    };
    const refreshToken = this.jwtRefreshService.sign(payload);
    const accessToken = this.jwtAccessService.sign(payload);
    await this.refreshTokenService.update(refreshToken, user._id);
    return {
      access_token: accessToken,
      uid: user._id,
      fullName: `${user.firstName} ${user.lastName}`,
      img: user.img && `${process.env.CLOUDI_URL}/${user.img}`,
      refresh_token: refreshToken,
    };
  }

  async googleLogin(googleUser: {
    googleId: string;
    email: string;
    firstName: string;
    lastName: string;
  }) {
    const user = await this.userService.findOrCreateGoogleUser(googleUser);
    return this.login(user);
  }

  async verifyGoogleIdToken(idToken: string) {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: this.configService.get('GOOGLE_CLIENT_ID'),
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedException('Invalid Google token');
      }

      const googleUser = {
        googleId: payload.sub,
        email: payload.email,
        firstName: payload.given_name || '',
        lastName: payload.family_name || '',
      };

      return this.googleLogin(googleUser);
    } catch (error) {
      throw new UnauthorizedException('Invalid Google token');
    }
  }

  createPendingAuthToken(userData: any): string {
    const token = randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minut ważności

    this.pendingAuthTokens.set(token, { userData, expiresAt });

    // Automatyczne czyszczenie po wygaśnięciu
    setTimeout(() => {
      this.pendingAuthTokens.delete(token);
    }, 5 * 60 * 1000);

    return token;
  }

  consumePendingAuthToken(token: string): any {
    const pending = this.pendingAuthTokens.get(token);

    if (!pending) {
      throw new UnauthorizedException('Invalid or expired auth token');
    }

    if (Date.now() > pending.expiresAt) {
      this.pendingAuthTokens.delete(token);
      throw new UnauthorizedException('Auth token expired');
    }

    // Token jest jednorazowy - usuwamy po użyciu
    this.pendingAuthTokens.delete(token);
    return pending.userData;
  }
}
