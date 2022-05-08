import { Controller, Get, Param, Req } from '@nestjs/common';
import { UserService } from './user.service';
import { plainToInstance } from 'class-transformer';
import { User } from './schemas/user.schema';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async findAll() {
    const users = await this.userService.findAll();
    return users.map((user) => plainToInstance(User, user.toObject()));
  }
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.userService.findById(id);
  }
  @Get(':id/subscriptions/:locationId')
  checkIfUserIsSubscriber(
    @Req() req,
    @Param('id') id: string,
    @Param('locationId') locationId: string,
  ) {
    const { uid } = req.cookies;
    return this.userService.checkIfUserIsSubscriber(id, locationId, uid);
  }
}
