import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from './user.service';
import { plainToInstance } from 'class-transformer';
import { User } from './schemas/user.schema';
import { UpdateNotificationTokenDto } from './dto/update-notification-token.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async findMe(@Req() req) {
    const { uid } = req.user;
    const user = await this.userService.findById(uid);
    return plainToInstance(User, user.toObject());
  }

  @Get()
  async findAll() {
    const users = await this.userService.findAll();
    return users.map((user) => plainToInstance(User, user.toObject()));
  }
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.userService.findById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/notification-tokens')
  setNotificationToken(
    @Body() updateNotificationTokenDto: UpdateNotificationTokenDto,
    @Req() req,
  ) {
    const { uid } = req.user;
    return this.userService.setNotificationToken(
      uid,
      updateNotificationTokenDto,
    );
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
    const { uid } = req.user;
    return this.userService.checkIfUserIsSubscriber(id, locationId, uid);
  }

  @UseGuards(JwtAuthGuard)
  @Post('/favorites/:locationId')
  async addFavoriteLocation(
    @Param('locationId') locationId: string,
    @Req() req,
  ) {
    const { uid } = req.user;
    return this.userService.addFavoriteLocation(uid, locationId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('/favorites/:locationId')
  async removeFavoriteLocation(
    @Param('locationId') locationId: string,
    @Req() req,
  ) {
    const { uid } = req.user;
    return this.userService.removeFavoriteLocation(uid, locationId);
  }
}
