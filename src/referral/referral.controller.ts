import { UpdateReferralDto } from './dto/update-referral.dto';
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
  Param,
  Put,
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
  findByQuery(@Query() referralQuery: ReferralQuery) {
    return this.referralService.findByQuery(referralQuery);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  invite(
    @Req() req,
    @Param('id') id: string,
    @Body() updateReferralDto: UpdateReferralDto,
  ) {
    return this.referralService.invite(id, req.user.uid, updateReferralDto);
  }
}
