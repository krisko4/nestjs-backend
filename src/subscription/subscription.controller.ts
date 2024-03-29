import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { SubscriptionFilterQuery } from './queries/subscription-filter.query';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createSubscriptionDto: CreateSubscriptionDto) {
    return this.subscriptionService.create(createSubscriptionDto);
  }
  @Get()
  find(@Query() subscriptionFilterQuery: SubscriptionFilterQuery) {
    return this.subscriptionService.find(subscriptionFilterQuery);
  }

  @UseGuards(JwtAuthGuard)
  @Delete()
  remove(@Query() subscriptionFilterQuery: SubscriptionFilterQuery) {
    return this.subscriptionService.remove(subscriptionFilterQuery);
  }
}
