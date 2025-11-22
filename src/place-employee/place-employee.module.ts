import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PlaceEmployee, PlaceEmployeeSchema } from './schemas/place-employee.schema';
import { PlaceEmployeeService } from './place-employee.service';
import { PlaceEmployeeRepository } from './place-employee.repository';
import { PlaceEmployeeController } from './place-employee.controller';
import { UserPlaceEmployeeController } from './place-employee.controller.user';
import { EmployeeModule } from 'src/employee/employee.module';
import { CodeModule } from 'src/code/code.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PlaceEmployee.name, schema: PlaceEmployeeSchema },
    ]),
    forwardRef(() => EmployeeModule),
    forwardRef(() => CodeModule),
  ],
  providers: [PlaceEmployeeService, PlaceEmployeeRepository],
  controllers: [PlaceEmployeeController, UserPlaceEmployeeController],
  exports: [PlaceEmployeeService, PlaceEmployeeRepository],
})
export class PlaceEmployeeModule {}
