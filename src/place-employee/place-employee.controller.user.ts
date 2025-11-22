import { Controller, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { PlaceEmployeeService } from './place-employee.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('user/place-employees')
export class UserPlaceEmployeeController {
  constructor(private readonly placeEmployeeService: PlaceEmployeeService) {}

  @UseGuards(JwtAuthGuard)
  @Patch(':id/accept')
  async acceptInvitation(@Param('id') id: string, @Req() req) {
    const { uid } = req.user;
    console.log('elo');
    return this.placeEmployeeService.acceptInvitation(id, uid);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/reject')
  async rejectInvitation(@Param('id') id: string, @Req() req) {
    const { uid } = req.user;
    return this.placeEmployeeService.rejectInvitation(id, uid);
  }
}
