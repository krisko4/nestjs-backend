import { PlaceModule } from 'src/place/place.module';
import { Module, forwardRef } from '@nestjs/common';
import { CodeService } from './code.service';
import { CodeController } from './code.controller';
import { Code, CodeSchema } from './schemas/code.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { CodeRepository } from './code.repository';
import { UserCodeController } from './code.controller.user';
import { CodeSseService } from './code-sse.service';
import { EmployeeModule } from 'src/employee/employee.module';

@Module({
  imports: [
    forwardRef(() => PlaceModule),
    forwardRef(() => EmployeeModule),
    MongooseModule.forFeature([{ name: Code.name, schema: CodeSchema }]),
  ],
  controllers: [CodeController, UserCodeController],
  providers: [CodeService, CodeRepository, CodeSseService],
  exports: [CodeService],
})
export class CodeModule {}
