import { NotificationModule } from '../notification/notification.module';
import { CodeModule } from '../code/code.module';
import { Module, forwardRef } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionRepository } from './subscription.repository';
import {
  Subscription,
  SubscriptionSchema,
} from './schemas/subscription.schema';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    CodeModule,
    NotificationModule,
    MongooseModule.forFeature([
      { name: Subscription.name, schema: SubscriptionSchema },
    ]),
  ],
  controllers: [SubscriptionController],
  providers: [SubscriptionService, SubscriptionRepository],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
