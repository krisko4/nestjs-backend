import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlaceEmployeeRepository } from './place-employee.repository';
import { EmployeeService } from 'src/employee/employee.service';
import { ClientSession, Types } from 'mongoose';
import {
  PlaceEmployeeRole,
  PlaceEmployeeStatus,
} from './schemas/place-employee.schema';

@Injectable()
export class PlaceEmployeeService {
  constructor(
    private readonly placeEmployeeRepository: PlaceEmployeeRepository,
    private readonly employeeService: EmployeeService,
  ) {}

  async addEmployeeToPlace(
    placeId: string,
    userId: string,
    email: string,
    name?: string,
    role: PlaceEmployeeRole = PlaceEmployeeRole.EMPLOYEE,
  ) {
    const isUserBoss = await this.isUserBossOfPlace(userId, placeId);
    if (!isUserBoss) {
      throw new ForbiddenException('NOT_ALLOWED');
    }

    let employee = await this.employeeService.findByEmail(email);
    if (!employee) {
      const user = await this.employeeService.getUserByEmail(email);
      employee = await this.employeeService.createEmployee({
        user: user?._id,
        email,
        name,
      });
    }

    const existing =
      await this.placeEmployeeRepository.findByPlaceIdAndEmployeeId(
        placeId,
        employee._id.toString(),
      );
    if (existing) {
      throw new BadRequestException('EMPLOYEE_ALREADY_ADDED_TO_PLACE');
    }

    return this.placeEmployeeRepository.create({
      place: new Types.ObjectId(placeId),
      employee: employee._id as Types.ObjectId,
      role,
      status: PlaceEmployeeStatus.WAITING_FOR_CONFIRMATION,
    });
  }

  async updatePlaceEmployee(
    placeEmployeeId: string,
    userId: string,
    role?: PlaceEmployeeRole,
    name?: string,
  ) {
    const placeEmployee =
      await this.placeEmployeeRepository.findByIdWithPopulate(placeEmployeeId);
    if (!placeEmployee) {
      throw new NotFoundException('PLACE_EMPLOYEE_NOT_FOUND');
    }

    const isUserBoss = await this.isUserBossOfPlace(
      userId,
      placeEmployee.place._id.toString(),
    );
    if (!isUserBoss) {
      throw new ForbiddenException('NOT_ALLOWED');
    }

    if (
      placeEmployee.employee.user._id.toString() === userId &&
      role &&
      role !== PlaceEmployeeRole.BOSS
    ) {
      throw new ForbiddenException('CANNOT_DEGRADE_YOURSELF');
    }

    if (name !== undefined && placeEmployee.employee) {
      await this.employeeService.updateEmployee(
        placeEmployee.employee._id.toString(),
        { name },
      );
    }

    const updateData: any = {};
    if (role !== undefined) {
      updateData.role = role;
    }

    if (Object.keys(updateData).length > 0) {
      return this.placeEmployeeRepository.updatePlaceEmployee(
        placeEmployeeId,
        updateData,
      );
    }

    return placeEmployee;
  }

  async removeEmployeeFromPlace(placeEmployeeId: string, userId: string) {
    const placeEmployee =
      await this.placeEmployeeRepository.findByIdWithPopulate(placeEmployeeId);
    if (!placeEmployee) {
      throw new NotFoundException('PLACE_EMPLOYEE_NOT_FOUND');
    }

    const isUserBoss = await this.isUserBossOfPlace(
      userId,
      placeEmployee.place._id.toString(),
    );
    if (!isUserBoss) {
      throw new ForbiddenException('NOT_ALLOWED');
    }

    if (
      placeEmployee.employee.user &&
      placeEmployee.employee.user._id.toString() === userId
    ) {
      throw new BadRequestException('CANNOT_DELETE_YOURSELF');
    }

    const employeeId = placeEmployee.employee._id.toString();

    // Usuń powiązanie pracownika z miejscem
    await this.placeEmployeeRepository.removePlaceEmployee(placeEmployeeId);

    // Sprawdź ile przypisań do miejsc ma pracownik po usunięciu
    const remainingAssignments =
      await this.placeEmployeeRepository.countEmployeePlaceAssignments(
        employeeId,
      );

    // Jeśli nie ma żadnych innych przypisań, usuń całkowicie pracownika
    if (remainingAssignments === 0) {
      await this.employeeService.removeEmployee(employeeId);
    }

    return { success: true, employeeDeleted: remainingAssignments === 0 };
  }

  /**
   * Pobierz pracowników miejsca z paginacją
   */
  async getEmployeesByPlaceId(
    placeId: string,
    userId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    // Sprawdź czy użytkownik ma dostęp
    const userPlaceEmployee =
      await this.placeEmployeeRepository.findByPlaceIdAndUserId(
        placeId,
        userId,
      );
    if (!userPlaceEmployee) {
      throw new ForbiddenException('NOT_ALLOWED');
    }

    return this.placeEmployeeRepository.findByPlaceIdAndPopulate(
      placeId,
      page,
      limit,
    );
  }

  /**
   * Pobierz wszystkich pracowników ze wszystkich miejsc użytkownika z paginacją
   */
  async getAllEmployees(userId: string, page: number = 1, limit: number = 10) {
    return this.placeEmployeeRepository.findAllEmployeesByUserId(
      userId,
      page,
      limit,
    );
  }

  /**
   * Pobierz miejsca użytkownika
   */
  async getPlacesByUserId(userId: string) {
    return this.placeEmployeeRepository.findByUserId(userId);
  }

  async isUserBossOfPlace(userId: string, placeId: string): Promise<boolean> {
    return this.placeEmployeeRepository.isUserBossOfPlace(userId, placeId);
  }

  /**
   * Znajdź PlaceEmployee po placeId i userId
   */
  async findByPlaceIdAndUserId(placeId: string, userId: string) {
    return this.placeEmployeeRepository.findByPlaceIdAndUserId(placeId, userId);
  }

  /**
   * Znajdź wszystkie PlaceEmployee dla użytkownika
   */
  async findByUserId(userId: string) {
    return this.placeEmployeeRepository.findByUserId(userId);
  }

  /**
   * Utwórz PlaceEmployee z sesją (dla transakcji)
   */
  async createPlaceEmployee(
    data: {
      place: Types.ObjectId;
      employee: Types.ObjectId;
      role: PlaceEmployeeRole;
      status: PlaceEmployeeStatus;
    },
    session?: ClientSession,
  ) {
    return this.placeEmployeeRepository.create(data, session);
  }
}
