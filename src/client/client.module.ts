import { Module } from '@nestjs/common';
import { ClientService } from './client.service';
import { CodeModule } from 'src/code/code.module';
import { PlaceModule } from 'src/place/place.module';
import { AdminClientController } from './client.controller.admin';

@Module({
  imports: [CodeModule, PlaceModule],
  controllers: [AdminClientController],
  providers: [ClientService],
  exports: [ClientService],
})
export class ClientModule {}
