import {
  Controller,
  Get,
  Post,
  Res,
  Request,
  UseGuards,
  Req,
  Body,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LocalAuthGuard } from './local-auth.guard';
import { GoogleAuthGuard } from './google-auth.guard';
import { Response } from 'express';
import { JwtRefreshGuard } from './jwt-refresh.guard';
import { IRefresh } from './interfaces/refresh.interface';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}
  @UseGuards(LocalAuthGuard)
  @Post('/login')
  async login(@Request() req, @Res({ passthrough: true }) response: Response) {
    const userData = await this.authService.login(req.user);
    response.cookie('uid', userData.uid.toString());
    response.cookie('access_token', userData.access_token);
    response.cookie('refresh_token', userData.refresh_token);
    return userData;
  }
  @UseGuards(JwtAuthGuard)
  @Get()
  authenticate() {
    return 'Authentication successful';
  }

  @UseGuards(JwtRefreshGuard)
  @Get('/refresh')
  async refresh(@Req() request: IRefresh) {
    return this.authService.refresh(request.user.uid);
  }

  @UseGuards(JwtAuthGuard)
  @Get('/logout')
  async logout(
    @Req() request: IRefresh,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(request.user.uid);
    response.clearCookie('access_token');
    response.clearCookie('refresh_token');
    response.clearCookie('uid');
    return 'Logout successful';
  }

  @UseGuards(GoogleAuthGuard)
  @Get('/google')
  async googleAuth() {
    // Guard redirects to Google OAuth
  }

  @UseGuards(GoogleAuthGuard)
  @Get('/google/callback')
  async googleAuthCallback(
    @Req() req,
    @Res({ passthrough: true }) response: Response,
  ) {
    const userData = await this.authService.googleLogin(req.user);
    response.cookie('uid', userData.uid.toString());
    response.cookie('access_token', userData.access_token);
    response.cookie('refresh_token', userData.refresh_token);

    const clientUrl = this.configService.get('CLIENT_URL_WEB');
    response.redirect(`${clientUrl}/auth/callback`);
  }

  @Post('/google/native')
  async googleNativeLogin(
    @Body() body: { idToken: string },
    @Res({ passthrough: true }) response: Response,
  ) {
    const userData = await this.authService.verifyGoogleIdToken(body.idToken);
    response.cookie('uid', userData.uid.toString());
    response.cookie('access_token', userData.access_token);
    response.cookie('refresh_token', userData.refresh_token);
    return userData;
  }
}
