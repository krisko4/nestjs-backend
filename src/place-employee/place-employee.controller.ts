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
import { PlaceEmployeeService } from './place-employee.service';
import { CreatePlaceEmployeeDto } from './dto/create-place-employee.dto';
import { UpdatePlaceEmployeeDto } from './dto/update-place-employee.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PaginationQuery } from 'src/client/dto/pagination.query';

@Controller('admin/places/:placeId/employees')
@UseGuards(JwtAuthGuard)
export class PlaceEmployeeController {
  constructor(private readonly placeEmployeeService: PlaceEmployeeService) {}

  @Post()
  async addEmployee(
    @Param('placeId') placeId: string,
    @Body() createPlaceEmployeeDto: CreatePlaceEmployeeDto,
    @Req() req,
  ) {
    const { uid } = req.user;
    return this.placeEmployeeService.addEmployeeToPlace(
      placeId,
      uid,
      createPlaceEmployeeDto.email,
      createPlaceEmployeeDto.name,
      createPlaceEmployeeDto.role,
    );
  }

  @Get()
  async getEmployees(
    @Param('placeId') placeId: string,
    @Query() pagination: PaginationQuery,
    @Req() req: any,
  ) {
    const { uid } = req.user;
    const { page = 1, limit = 10 } = pagination;

    if (placeId) {
      return this.placeEmployeeService.getEmployeesByPlaceId(
        placeId,
        uid,
        page,
        limit,
      );
    }
    return this.placeEmployeeService.getAllEmployees(uid, page, limit);
  }

  @Patch(':placeEmployeeId')
  async updateEmployee(
    @Param('placeEmployeeId') placeEmployeeId: string,
    @Body() updatePlaceEmployeeDto: UpdatePlaceEmployeeDto,
    @Req() req,
  ) {
    const { uid } = req.user;
    return this.placeEmployeeService.updatePlaceEmployee(
      placeEmployeeId,
      uid,
      updatePlaceEmployeeDto.role,
      updatePlaceEmployeeDto.name,
    );
  }

  @Delete(':placeEmployeeId')
  async removeEmployee(
    @Param('placeEmployeeId') placeEmployeeId: string,
    @Req() req,
  ) {
    const { uid } = req.user;
    return this.placeEmployeeService.removeEmployeeFromPlace(
      placeEmployeeId,
      uid,
    );
  }
}
