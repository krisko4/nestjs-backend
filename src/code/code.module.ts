import { Module } from '@nestjs/common';
import { CodeService } from './code.service';
import { CodeController } from './code.controller';
import { Code, CodeSchema } from './schemas/code.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { CodeRepository } from './code.repository';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Code.name, schema: CodeSchema }]),
  ],
  controllers: [CodeController],
  providers: [CodeService, CodeRepository],
  exports: [CodeService],
})
export class CodeModule {}
