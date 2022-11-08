import {
  Controller,
  Get,
  Req,
  UseGuards,
  Query,
  Post,
  Body,
} from '@nestjs/common';
import { InvitationService } from './invitation.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { InvitationQuery } from './queries/invitation.query';

@Controller('invitations')
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  findByQuery(@Req() req, @Query() query: InvitationQuery) {
    return this.invitationService.findByQuery(query, req.user.uid);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  invite(@Req() req, @Body() createInvitationDto: CreateInvitationDto) {
    return this.invitationService.create(createInvitationDto, req.user.uid);
  }
}
