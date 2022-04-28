import {
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UserDocument } from 'src/user/schemas/user.schema';
import { RefreshTokenService } from 'src/refresh-token/refresh-token.service';
import { IJWTPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    @Inject('JwtAccessService')
    private readonly jwtAccessService: JwtService,
    @Inject('JwtRefreshService')
    private readonly jwtRefreshService: JwtService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

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
}
