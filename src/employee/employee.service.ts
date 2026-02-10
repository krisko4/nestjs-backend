import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { EmployeeRepository } from './employee.repository';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { UserService } from 'src/user/user.service';
import { ClientSession, Types } from 'mongoose';
import { CreateEmployeeSchema } from './schemas/employee.schema';
import {
  LocationAssignment,
  PlaceEmployeeRole,
  PlaceEmployeeStatus,
} from './schemas/place-assignment.schema';
import { InjectConnection } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { CodeService } from 'src/code/code.service';

@Injectable()
export class EmployeeService {
  constructor(
    private readonly employeeRepository: EmployeeRepository,
    private readonly userService: UserService,
    @InjectConnection() private readonly connection: mongoose.Connection,
    @Inject(forwardRef(() => CodeService))
    private readonly codeService: CodeService,
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

  async removeEmployee(employeeId: string) {
    const employee = await this.employeeRepository.findByIdWithPopulate(
      employeeId,
    );
    if (!employee) {
      throw new NotFoundException('EMPLOYEE_NOT_FOUND');
    }

    return this.employeeRepository.removeEmployee(employeeId);
  }

  async findByEmail(email: string) {
    return this.employeeRepository.findByEmail(email);
  }

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

  // New place assignment methods

  async addEmployeeToPlace(
    placeId: string,
    userId: string,
    data: {
      email: string;
      name?: string;
      locations: Array<{ locationId: string; role: PlaceEmployeeRole }>;
    },
  ) {
    const isUserBoss = await this.isUserBossOfPlace(userId, placeId);
    if (!isUserBoss) {
      throw new ForbiddenException('NOT_ALLOWED');
    }

    const { email, name, locations } = data;

    let employee = await this.employeeRepository.findByEmail(email);
    if (!employee) {
      const user = await this.userService.findByEmail(email);
      employee = await this.employeeRepository.create({
        user: user?._id,
        email,
      });
    }

    const existingAssignment = employee.places?.find(
      (p) => p.place.toString() === placeId,
    );
    if (existingAssignment) {
      throw new BadRequestException('EMPLOYEE_ALREADY_ADDED_TO_PLACE');
    }

    const locationAssignments: LocationAssignment[] = locations.map(
      ({ locationId, role }) => ({
        locationId: new Types.ObjectId(locationId),
        role,
        status: PlaceEmployeeStatus.WAITING_FOR_CONFIRMATION,
      }),
    );

    await this.employeeRepository.addPlaceAssignment(
      employee._id.toString(),
      new Types.ObjectId(placeId),
      locationAssignments,
      name,
    );

    return true;
  }

  async updatePlaceEmployee(
    employeeId: string,
    placeId: string,
    userId: string,
    updateDto: {
      name?: string;
      locations?: Array<{ locationId: string; role: PlaceEmployeeRole }>;
    },
  ) {
    const employee = await this.employeeRepository.findByIdWithPopulate(
      employeeId,
    );
    if (!employee) {
      throw new NotFoundException('EMPLOYEE_NOT_FOUND');
    }

    const isUserBoss = await this.isUserBossOfPlace(userId, placeId);
    if (!isUserBoss) {
      throw new ForbiddenException('NOT_ALLOWED');
    }

    const { name, locations } = updateDto;

    // Find the place assignment
    const placeAssignment = employee.places.find(
      (p) => p.place._id.toString() === placeId,
    );
    if (!placeAssignment) {
      throw new NotFoundException('PLACE_ASSIGNMENT_NOT_FOUND');
    }

    // Prevent self-demotion
    if (employee.user && employee.user._id.toString() === userId && locations) {
      const userIsBossInNewLocations = locations.some(
        (loc) => loc.role === PlaceEmployeeRole.BOSS,
      );
      if (!userIsBossInNewLocations) {
        throw new ForbiddenException('CANNOT_DEGRADE_YOURSELF');
      }
    }

    const updates: {
      name?: string;
      locations?: LocationAssignment[];
    } = {};

    if (name !== undefined) {
      updates.name = name;
    }

    if (locations !== undefined && locations.length > 0) {
      const currentLocationMap = new Map(
        placeAssignment.locations.map((loc) => [
          loc.locationId.toString(),
          loc,
        ]),
      );

      const updatedLocations: LocationAssignment[] = locations.map(
        ({ locationId, role }) => {
          const existingLoc = currentLocationMap.get(locationId);
          return {
            locationId: new Types.ObjectId(locationId),
            role,
            status: existingLoc?.status || PlaceEmployeeStatus.ACTIVE,
          };
        },
      );

      updates.locations = updatedLocations;
    }

    await this.employeeRepository.updatePlaceAssignment(
      employeeId,
      placeId,
      updates,
    );

    return this.employeeRepository.findByIdWithPopulate(employeeId);
  }

  async removeEmployeeFromPlace(
    employeeId: string,
    placeId: string,
    userId: string,
  ) {
    const employee = await this.employeeRepository.findByIdWithPopulate(
      employeeId,
    );
    if (!employee) {
      throw new NotFoundException('EMPLOYEE_NOT_FOUND');
    }

    const isUserBoss = await this.isUserBossOfPlace(userId, placeId);
    if (!isUserBoss) {
      throw new ForbiddenException('NOT_ALLOWED');
    }

    if (employee.user && employee.user._id.toString() === userId) {
      throw new BadRequestException('CANNOT_DELETE_YOURSELF');
    }

    await this.employeeRepository.removePlaceAssignment(employeeId, placeId);

    // Check if employee has any other place assignments
    const updatedEmployee = await this.employeeRepository.findById(employeeId);
    const hasOtherAssignments =
      updatedEmployee &&
      updatedEmployee.places &&
      updatedEmployee.places.length > 0;

    // If no other assignments, delete the employee
    if (!hasOtherAssignments) {
      await this.employeeRepository.removeEmployee(employeeId);
    }

    return { success: true, employeeDeleted: !hasOtherAssignments };
  }

  async getEmployeesByPlaceId(
    placeId: string,
    userId: string,
    page: number = 0,
    limit: number = 10,
    locationIds?: string[],
  ) {
    const userEmployee = await this.employeeRepository.findByPlaceIdAndUserId(
      placeId,
      userId,
    );
    if (!userEmployee) {
      throw new ForbiddenException('NOT_ALLOWED');
    }

    return this.employeeRepository.findByPlaceId(
      placeId,
      page,
      limit,
      locationIds,
    );
  }

  async getAllEmployees(userId: string, page: number = 0, limit: number = 10) {
    return this.employeeRepository.getAllEmployeesByUserId(userId, page, limit);
  }

  async getEmployeeDetails(employeeId: string, userId: string) {
    const employee = await this.employeeRepository.findByIdWithPopulate(
      employeeId,
    );
    if (!employee) {
      throw new NotFoundException('EMPLOYEE_NOT_FOUND');
    }

    // Get places where user is BOSS
    const userEmployees = await this.employeeRepository.findByUserId(userId);
    const userPlaceIds = new Set(
      userEmployees.flatMap((e) =>
        e.places
          .filter((p) =>
            p.locations.some((loc) => loc.role === PlaceEmployeeRole.BOSS),
          )
          .map((p) => p.place.toString()),
      ),
    );

    // Filter employee's places to only show places where user is BOSS
    const filteredPlaces = employee.places.filter((p) =>
      userPlaceIds.has(p.place._id.toString()),
    );

    if (filteredPlaces.length === 0) {
      throw new ForbiddenException('NOT_ALLOWED');
    }

    return {
      email: employee.email,
      userId: employee.user?._id,
      places: filteredPlaces,
    };
  }

  async getEmployeesByUserId(userId: string) {
    const employees = await this.employeeRepository.findByUserId(userId);
    return employees;
  }

  async isUserBossOfPlace(userId: string, placeId: string): Promise<boolean> {
    return this.employeeRepository.isUserBossOfPlace(userId, placeId);
  }

  async isUserBossOfLocation(
    userId: string,
    locationId: string,
  ): Promise<boolean> {
    return this.employeeRepository.isUserBossOfLocation(userId, locationId);
  }

  async findByPlaceIdAndUserId(placeId: string, userId: string) {
    return this.employeeRepository.findByPlaceIdAndUserId(placeId, userId);
  }

  async acceptInvitation(
    employeeId: string,
    placeId: string,
    locationIds: string[],
    userId: string,
  ) {
    const employee = await this.employeeRepository.findByIdWithPopulate(
      employeeId,
    );

    if (!employee) {
      throw new NotFoundException('EMPLOYEE_NOT_FOUND');
    }

    if (!employee.user || employee.user._id.toString() !== userId.toString()) {
      throw new ForbiddenException('NOT_ALLOWED');
    }

    const placeAssignment = employee.places.find(
      (p) => p.place._id.toString() === placeId,
    );

    if (!placeAssignment) {
      throw new NotFoundException('PLACE_ASSIGNMENT_NOT_FOUND');
    }

    // Verify all locations exist and are in WAITING_FOR_CONFIRMATION status
    for (const locationId of locationIds) {
      const locationAssignment = placeAssignment.locations.find(
        (loc) => loc.locationId.toString() === locationId,
      );

      if (!locationAssignment) {
        throw new NotFoundException(
          `LOCATION_ASSIGNMENT_NOT_FOUND: ${locationId}`,
        );
      }

      if (
        locationAssignment.status !==
        PlaceEmployeeStatus.WAITING_FOR_CONFIRMATION
      ) {
        throw new BadRequestException(`INVITATION_NOT_PENDING: ${locationId}`);
      }
    }

    return this.employeeRepository.updateMultipleLocationStatuses(
      employeeId,
      placeId,
      locationIds,
      PlaceEmployeeStatus.ACTIVE,
    );
  }

  async rejectInvitation(
    employeeId: string,
    placeId: string,
    locationIds: string[],
    userId: string,
  ) {
    const employee = await this.employeeRepository.findByIdWithPopulate(
      employeeId,
    );

    if (!employee) {
      throw new NotFoundException('EMPLOYEE_NOT_FOUND');
    }

    if (!employee.user || employee.user._id.toString() !== userId.toString()) {
      throw new ForbiddenException('NOT_ALLOWED');
    }

    const placeAssignment = employee.places.find(
      (p) => p.place._id.toString() === placeId,
    );

    if (!placeAssignment) {
      throw new NotFoundException('PLACE_ASSIGNMENT_NOT_FOUND');
    }

    // Verify all locations exist and are in WAITING_FOR_CONFIRMATION status
    for (const locationId of locationIds) {
      const locationAssignment = placeAssignment.locations.find(
        (loc) => loc.locationId.toString() === locationId,
      );

      if (!locationAssignment) {
        throw new NotFoundException(
          `LOCATION_ASSIGNMENT_NOT_FOUND: ${locationId}`,
        );
      }

      if (
        locationAssignment.status !==
        PlaceEmployeeStatus.WAITING_FOR_CONFIRMATION
      ) {
        throw new BadRequestException(`INVITATION_NOT_PENDING: ${locationId}`);
      }
    }

    return this.employeeRepository.updateMultipleLocationStatuses(
      employeeId,
      placeId,
      locationIds,
      PlaceEmployeeStatus.REJECTED,
    );
  }

  async addPlaceAssignment(
    employeeId: string,
    placeId: Types.ObjectId,
    locationAssignments: LocationAssignment[],
    name?: string,
    session?: ClientSession,
  ) {
    return this.employeeRepository.addPlaceAssignment(
      employeeId,
      placeId,
      locationAssignments,
      name,
      session,
    );
  }

  async updatePlaceAssignment(
    employeeId: string,
    placeId: string,
    updates: { name?: string; locations?: LocationAssignment[] },
    session?: ClientSession,
  ) {
    return this.employeeRepository.updatePlaceAssignment(
      employeeId,
      placeId,
      updates,
      session,
    );
  }

  async getScanHistoryByEmployeeId(
    employeeId: string,
    placeId: string,
    requestingUserId: string,
    start: number = 0,
    limit: number = 10,
  ) {
    const employee = await this.employeeRepository.findByIdWithPopulate(
      employeeId,
    );

    if (!employee) {
      throw new NotFoundException('EMPLOYEE_NOT_FOUND');
    }

    const isUserBoss = await this.isUserBossOfPlace(requestingUserId, placeId);

    if (!isUserBoss) {
      throw new ForbiddenException('NOT_ALLOWED');
    }

    if (!employee.user) {
      return {
        data: [],
        metadata: {
          start,
          limit,
          total: 0,
        },
      };
    }

    const userId = employee.user._id.toString();
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

  async countByPlaceId(placeId: string): Promise<number> {
    return this.employeeRepository.countByPlaceId(placeId);
  }
}
