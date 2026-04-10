import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserPoints, UserPointsSchema } from './schemas/user-points.schema';
import {
  PointsTransaction,
  PointsTransactionSchema,
} from './schemas/points-transaction.schema';
import { PointsRepository } from './points.repository';
import { PointsService } from './points.service';
import { UserPointsController } from './points.controller.user';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserPoints.name, schema: UserPointsSchema },
      { name: PointsTransaction.name, schema: PointsTransactionSchema },
    ]),
  ],
  controllers: [UserPointsController],
  providers: [PointsService, PointsRepository],
  exports: [PointsService],
})
export class PointsModule {}
