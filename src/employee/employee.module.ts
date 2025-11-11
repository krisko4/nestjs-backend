import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployeeService } from './employee.service';
import { EmployeeRepository } from './employee.repository';
import { Employee, EmployeeSchema } from './schemas/employee.schema';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Employee.name, schema: EmployeeSchema },
    ]),
    forwardRef(() => UserModule),
  ],
  providers: [EmployeeService, EmployeeRepository],
  controllers: [],
  exports: [EmployeeService, EmployeeRepository],
})
export class EmployeeModule {}
