import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { PlaceEmployeeRepository } from './place-employee.repository';
import { EmployeeService } from 'src/employee/employee.service';
import mongoose, { ClientSession, Types } from 'mongoose';
import {
  PlaceEmployeeDocument,
  PlaceEmployeeRole,
  PlaceEmployeeStatus,
} from './schemas/place-employee.schema';
import { CreatePlaceEmployeeDto } from './dto/create-place-employee.dto';
import { InjectConnection } from '@nestjs/mongoose';
import { CodeService } from 'src/code/code.service';

@Injectable()
export class PlaceEmployeeService {
  constructor(
    private readonly placeEmployeeRepository: PlaceEmployeeRepository,
    private readonly employeeService: EmployeeService,
    @InjectConnection() private readonly connection: mongoose.Connection,
    @Inject(forwardRef(() => CodeService))
    private readonly codeService: CodeService,
  ) {}

  async addEmployeeToPlace(
    placeId: string,
    userId: string,
    createEmployeeDto: CreatePlaceEmployeeDto,
  ) {
    const isUserBoss = await this.isUserBossOfPlace(userId, placeId);
    if (!isUserBoss) {
      throw new ForbiddenException('NOT_ALLOWED');
    }

    const { email, name, role, locationIds } = createEmployeeDto;

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

    const session = await this.connection.startSession();

    await session.withTransaction(async () => {
      for (const locationId of locationIds) {
        this.placeEmployeeRepository.create({
          place: new Types.ObjectId(placeId),
          location: new Types.ObjectId(locationId),
          employee: employee._id as Types.ObjectId,
          role,
          status: PlaceEmployeeStatus.WAITING_FOR_CONFIRMATION,
        });
      }
    });

    await session.endSession();

    return true;
  }

  async updatePlaceEmployee(
    placeEmployeeId: string,
    userId: string,
    updateDto: {
      role?: PlaceEmployeeRole;
      name?: string;
      locationIds?: string[];
    },
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

    const { role, name, locationIds } = updateDto;

    console.log(placeEmployee);

    if (
      placeEmployee.employee.user &&
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

    const placeId = placeEmployee.place._id.toString();
    const employeeId = placeEmployee.employee._id.toString();

    if (role !== undefined) {
      await this.placeEmployeeRepository.updateRoleForAllLocations(
        placeId,
        employeeId,
        role,
      );
    }

    if (locationIds !== undefined && locationIds.length > 0) {
      const currentAssignments =
        await this.placeEmployeeRepository.findByPlaceIdAndEmployeeId(
          placeId,
          employeeId,
        );

      if (currentAssignments) {
        const allAssignments =
          await this.placeEmployeeRepository.findAllByPlaceIdAndEmployeeId(
            placeId,
            employeeId,
          );

        const currentLocationIds = allAssignments.map(
          (a: PlaceEmployeeDocument) => a.location.toString(),
        );
        const newLocationIdsSet = new Set(locationIds);

        const locationsToRemove = currentLocationIds.filter(
          (locId: string) => !newLocationIdsSet.has(locId),
        );

        const locationsToAdd = locationIds.filter(
          (locId) => !currentLocationIds.includes(locId),
        );

        for (const locationId of locationsToRemove) {
          await this.placeEmployeeRepository.removeByPlaceEmployeeAndLocation(
            placeId,
            employeeId,
            locationId,
          );
        }

        const session = await this.connection.startSession();
        await session.withTransaction(async () => {
          for (const locationId of locationsToAdd) {
            await this.placeEmployeeRepository.create({
              place: new Types.ObjectId(placeId),
              location: new Types.ObjectId(locationId),
              employee: new Types.ObjectId(employeeId),
              role: role || placeEmployee.role,
              status: placeEmployee.status,
            });
          }
        });
        await session.endSession();
      }
    }

    return this.placeEmployeeRepository.findByIdWithPopulate(placeEmployeeId);
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

  async getEmployeesByPlaceId(
    placeId: string,
    userId: string,
    page: number = 1,
    limit: number = 10,
    locationIds?: string[],
  ) {
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
      locationIds,
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

  async getPlaceEmployeeById(placeEmployeeId: string, userId: string) {
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

    return placeEmployee;
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

  async isUserBossOfLocation(
    userId: string,
    locationId: string,
  ): Promise<boolean> {
    return this.placeEmployeeRepository.isUserBossOfLocation(
      userId,
      locationId,
    );
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

  async createPlaceEmployee(
    data: {
      place: Types.ObjectId;
      location: Types.ObjectId;
      employee: Types.ObjectId;
      role: PlaceEmployeeRole;
      status: PlaceEmployeeStatus;
    },
    session?: ClientSession,
  ) {
    return this.placeEmployeeRepository.create(data, session);
  }

  async getScanHistoryByPlaceEmployeeId(
    placeEmployeeId: string,
    requestingUserId: string,
    start: number = 0,
    limit: number = 10,
  ) {
    const placeEmployee =
      await this.placeEmployeeRepository.findByIdWithPopulate(placeEmployeeId);

    if (!placeEmployee) {
      throw new NotFoundException('PLACE_EMPLOYEE_NOT_FOUND');
    }

    const isUserBoss = await this.isUserBossOfPlace(
      requestingUserId,
      placeEmployee.place._id.toString(),
    );

    if (!isUserBoss) {
      throw new ForbiddenException('NOT_ALLOWED');
    }

    if (!placeEmployee.employee.user) {
      return {
        data: [],
        metadata: {
          start,
          limit,
          total: 0,
        },
      };
    }

    const userId = placeEmployee.employee.user._id.toString();

    // Konwertuj start (offset) na page (numer strony)
    const page = Math.floor(start / limit) + 1;

    const { data, total } = await this.codeService.findScanHistoryByUserId(
      userId,
      page,
      limit,
    );

    return {
      data,
      metadata: {
        start,
        limit,
        total,
      },
    };
  }
}
