import { PlaceModule } from 'src/place/place.module';
import { Module, forwardRef } from '@nestjs/common';
import { CodeService } from './code.service';
import { CodeController } from './code.controller';
import { Code, CodeSchema } from './schemas/code.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { CodeRepository } from './code.repository';

@Module({
  imports: [
    forwardRef(() => PlaceModule),
    MongooseModule.forFeature([{ name: Code.name, schema: CodeSchema }]),
  ],
  controllers: [CodeController],
  providers: [CodeService, CodeRepository],
  exports: [CodeService],
})
export class CodeModule {}
