import {
  Controller,
  Param,
  Patch,
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('user/employees')
@UseGuards(JwtAuthGuard)
export class UserEmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Patch(':employeeId/places/:placeId/locations/:locationId/accept')
  async acceptInvitation(
    @Param('employeeId') employeeId: string,
    @Param('placeId') placeId: string,
    @Param('locationId') locationId: string,
    @Req() req,
  ) {
    const { uid } = req.user;
    return this.employeeService.acceptInvitation(
      employeeId,
      placeId,
      locationId,
      uid,
    );
  }

  @Patch(':employeeId/places/:placeId/locations/:locationId/reject')
  async rejectInvitation(
    @Param('employeeId') employeeId: string,
    @Param('placeId') placeId: string,
    @Param('locationId') locationId: string,
    @Req() req,
  ) {
    const { uid } = req.user;
    return this.employeeService.rejectInvitation(
      employeeId,
      placeId,
      locationId,
      uid,
    );
  }
}
