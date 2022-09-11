import {
  Controller,
  Get,
  Post,
  Res,
  Request,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LocalAuthGuard } from './local-auth.guard';
import { Response } from 'express';
import { JwtRefreshGuard } from './jwt-refresh.guard';
import { IRefresh } from './interfaces/refresh.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @UseGuards(LocalAuthGuard)
  @Post('/login')
  async login(@Request() req, @Res({ passthrough: true }) response: Response) {
    const userData = await this.authService.login(req.user);
    response.cookie('uid', userData.uid);
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
}
