import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployeeService } from './employee.service';
import { EmployeeRepository } from './employee.repository';
import { Employee, EmployeeSchema } from './schemas/employee.schema';
import { UserModule } from 'src/user/user.module';
import { UserEmployeeController } from './employee.controller.user';
import { CodeModule } from 'src/code/code.module';
import { AdminEmployeeController } from './employee.controller.admin';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Employee.name, schema: EmployeeSchema },
    ]),
    forwardRef(() => UserModule),
    forwardRef(() => CodeModule),
  ],
  providers: [EmployeeService, EmployeeRepository],
  controllers: [AdminEmployeeController, UserEmployeeController],
  exports: [EmployeeService, EmployeeRepository],
})
export class EmployeeModule {}
