import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MongoRepository } from '../database/repository';
import {
  CreateEmployeeSchema,
  Employee,
  EmployeeDocument,
  EmployeePopulated,
} from './schemas/employee.schema';

@Injectable()
export class EmployeeRepository extends MongoRepository<
  EmployeeDocument,
  CreateEmployeeSchema
> {
  constructor(
    @InjectModel(Employee.name)
    private readonly employeeModel: Model<EmployeeDocument>,
  ) {
    super(employeeModel);
  }

  async findByUserId(userId: string): Promise<EmployeeDocument[]> {
    return this.employeeModel
      .find({ user: new Types.ObjectId(userId) })
      .populate('user')
      .exec();
  }

  async findByEmail(email: string): Promise<EmployeeDocument | null> {
    return this.employeeModel.findOne({ email }).exec();
  }

  async updateEmployee(
    employeeId: string,
    updateData: { name?: string },
  ): Promise<EmployeeDocument | null> {
    return this.employeeModel
      .findByIdAndUpdate(
        employeeId,
        { $set: updateData },
        { new: true, runValidators: true },
      )
      .exec();
  }

  async removeEmployee(employeeId: string): Promise<EmployeeDocument | null> {
    return this.employeeModel.findByIdAndDelete(employeeId).exec();
  }

  async findByIdWithPopulate(
    employeeId: string,
  ): Promise<EmployeePopulated | null> {
    return this.employeeModel
      .findById(employeeId)
      .populate('user')
      .exec() as unknown as Promise<EmployeePopulated | null>;
  }
}
