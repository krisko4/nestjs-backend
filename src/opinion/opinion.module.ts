import { Module } from '@nestjs/common';
import { OpinionService } from './opinion.service';
import { OpinionController } from './opinion.controller';
import { Opinion, OpinionSchema } from './schemas/opinion.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from 'src/user/user.module';
import { OpinionRepository } from './opinion.repository';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Opinion.name, schema: OpinionSchema }]),
    UserModule,
  ],
  controllers: [OpinionController],
  providers: [OpinionService, OpinionRepository],
})
export class OpinionModule {}
