import { ReferralQuery } from './queries/referral.query';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  Query,
} from '@nestjs/common';
import { ReferralService } from './referral.service';
import { CreateReferralDto } from './dto/create-referral.dto';

@Controller('referrals')
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Req() req, @Body() createReferralDto: CreateReferralDto) {
    return this.referralService.create(createReferralDto, req.user.uid);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findByQuery(@Req() req, @Query() referralQuery: ReferralQuery) {
    return this.referralService.findByQuery(referralQuery, req.user.uid);
  }
}
