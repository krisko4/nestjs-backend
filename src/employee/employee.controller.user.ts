import {
  Controller,
  Param,
  Patch,
  Req,
  UseGuards,
  Body,
} from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { InvitationResponseDto } from './dto/invitation-response.dto';

@Controller('user/employees')
@UseGuards(JwtAuthGuard)
export class UserEmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Patch(':employeeId/places/:placeId/accept')
  async acceptInvitation(
    @Param('employeeId') employeeId: string,
    @Param('placeId') placeId: string,
    @Body() body: InvitationResponseDto,
    @Req() req,
  ) {
    const { uid } = req.user;
    return this.employeeService.acceptInvitation(
      employeeId,
      placeId,
      body.locationIds,
      uid,
    );
  }

  @Patch(':employeeId/places/:placeId/reject')
  async rejectInvitation(
    @Param('employeeId') employeeId: string,
    @Param('placeId') placeId: string,
    @Body() body: InvitationResponseDto,
    @Req() req,
  ) {
    const { uid } = req.user;
    return this.employeeService.rejectInvitation(
      employeeId,
      placeId,
      body.locationIds,
      uid,
    );
  }
}
