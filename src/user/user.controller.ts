import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from './user.service';
import { plainToInstance } from 'class-transformer';
import { User } from './schemas/user.schema';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

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

  @Patch(':id')
  setNotificationToken(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.userService.setNotificationToken(id, updateUserDto);
  }

  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileFieldsInterceptor([{ name: 'img', maxCount: 1 }]))
  @Patch(':id/profile-picture')
  updateProfilePicture(
    @Req() req,
    @Param('id') id: string,
    @UploadedFiles()
    files: {
      img?: Express.Multer.File[];
    },
  ) {
    const { uid } = req.user;
    return this.userService.updateProfilePicture(id, uid, files.img);
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
