import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmployeeRepository } from './employee.repository';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { UserService } from 'src/user/user.service';
import { ClientSession, Types } from 'mongoose';
import { CreateEmployeeSchema } from './schemas/employee.schema';

@Injectable()
export class EmployeeService {
  constructor(
    private readonly employeeRepository: EmployeeRepository,
    private readonly userService: UserService,
  ) {}

  async createEmployee(data: CreateEmployeeSchema, session?: ClientSession) {
    const existingEmployee = await this.employeeRepository.findByEmail(
      data.email,
    );
    if (existingEmployee) {
      throw new BadRequestException('EMPLOYEE_WITH_EMAIL_ALREADY_EXISTS');
    }

    return this.employeeRepository.create(data, session);
  }

  async updateEmployee(
    employeeId: string,
    updateEmployeeDto: UpdateEmployeeDto,
  ) {
    const employee = await this.employeeRepository.findByIdWithPopulate(
      employeeId,
    );
    if (!employee) {
      throw new NotFoundException('EMPLOYEE_NOT_FOUND');
    }

    return this.employeeRepository.updateEmployee(employeeId, {
      name: updateEmployeeDto.name,
    });
  }

  /**
   * Usuń pracownika
   */
  async removeEmployee(employeeId: string) {
    const employee = await this.employeeRepository.findByIdWithPopulate(
      employeeId,
    );
    if (!employee) {
      throw new NotFoundException('EMPLOYEE_NOT_FOUND');
    }

    return this.employeeRepository.removeEmployee(employeeId);
  }

  /**
   * Znajdź pracownika po emailu
   */
  async findByEmail(email: string) {
    return this.employeeRepository.findByEmail(email);
  }

  /**
   * Znajdź użytkownika po emailu (przez UserService)
   */
  async getUserByEmail(email: string) {
    return this.userService.findByEmail(email);
  }

  async findByUserId(userId: string) {
    return this.employeeRepository.findByUserId(userId);
  }

  async findById(employeeId: string) {
    return this.employeeRepository.findById(employeeId);
  }

  async assignUserToEmployeeByEmail(
    email: string,
    userId: Types.ObjectId,
    session?: ClientSession,
  ) {
    const employee = await this.employeeRepository.findByEmail(email);
    if (employee && !employee.user) {
      return this.employeeRepository.assignUser(
        employee._id.toString(),
        userId,
        session,
      );
    }
    return null;
  }
}
