import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { CreatePlaceEmployeeDto } from './dto/create-place-employee.dto';
import { UpdatePlaceEmployeeDto } from './dto/update-place-employee.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { EmployeeFilterQuery } from './queries/employee-filter.query';
import { PaginationQuery } from './queries/pagination.query';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminEmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post('places/:placeId/employees')
  async addEmployee(
    @Param('placeId') placeId: string,
    @Body() createPlaceEmployeeDto: CreatePlaceEmployeeDto,
    @Req() req,
  ) {
    const { uid } = req.user;
    return this.employeeService.addEmployeeToPlace(
      placeId,
      uid,
      createPlaceEmployeeDto,
    );
  }

  @Get('places/:placeId/employees')
  async getEmployees(
    @Param('placeId') placeId: string,
    @Query() filterQuery: EmployeeFilterQuery,
    @Req() req: any,
  ) {
    const { uid } = req.user;
    const { start = 0, limit = 10, locationIds } = filterQuery;

    if (placeId) {
      return this.employeeService.getEmployeesByPlaceId(
        placeId,
        uid,
        start,
        limit,
        locationIds,
      );
    }
    return this.employeeService.getAllEmployees(uid, start, limit);
  }

  @Get('employees/:employeeId')
  async getEmployeeDetails(
    @Param('employeeId') employeeId: string,
    @Req() req: any,
  ) {
    const { uid } = req.user;
    return this.employeeService.getEmployeeDetails(employeeId, uid);
  }

  @Get('places/:placeId/employees/:employeeId/scan-history')
  async getScanHistoryByEmployeeId(
    @Param('placeId') placeId: string,
    @Param('employeeId') employeeId: string,
    @Query() query: PaginationQuery,
    @Req() req: any,
  ) {
    const { uid } = req.user;
    const { start = 0, limit = 10 } = query;
    return this.employeeService.getScanHistoryByEmployeeId(
      employeeId,
      placeId,
      uid,
      start,
      limit,
    );
  }

  @Patch('places/:placeId/employees/:employeeId')
  async updateEmployee(
    @Param('placeId') placeId: string,
    @Param('employeeId') employeeId: string,
    @Body() updatePlaceEmployeeDto: UpdatePlaceEmployeeDto,
    @Req() req,
  ) {
    const { uid } = req.user;
    return this.employeeService.updatePlaceEmployee(
      employeeId,
      placeId,
      uid,
      updatePlaceEmployeeDto,
    );
  }

  @Delete('places/:placeId/employees/:employeeId')
  async removeEmployee(
    @Param('placeId') placeId: string,
    @Param('employeeId') employeeId: string,
    @Req() req,
  ) {
    const { uid } = req.user;
    return this.employeeService.removeEmployeeFromPlace(
      employeeId,
      placeId,
      uid,
    );
  }
}
