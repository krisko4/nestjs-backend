import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UserRepository } from './user.repository';
import { ClientSession } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { UpdateNotificationTokenDto } from './dto/update-notification-token.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(createUserDto: CreateUserDto, session?: ClientSession) {
    const { email, password } = createUserDto;
    const duplicateUser = await this.findByEmail(email);
    if (duplicateUser)
      throw new InternalServerErrorException(
        `User with email: ${email} already exists`,
      );
    const encryptedPassword = bcrypt.hashSync(password, 10);
    return this.userRepository.create(
      {
        ...createUserDto,
        isActive: true,
        password: encryptedPassword,
      },
      session,
    );
  }

  async updateProfilePicture(
    id: string,
    uid: string,
    img: Express.Multer.File[],
  ) {
    if (id.toString() !== uid.toString()) {
      throw new ForbiddenException('INVALID_ID');
    }
    const logoId = await this.cloudinaryService.uploadImage(
      img[0],
      'user_images',
    );
    this.userRepository.updateProfilePicture(uid, logoId);
  }

  setNotificationToken(
    id: string,
    updateNotificationTokenDto: UpdateNotificationTokenDto,
  ) {
    const { notificationToken, userLanguage } = updateNotificationTokenDto;
    return this.userRepository.setNotificationToken(
      id,
      notificationToken,
      userLanguage,
    );
  }

  removeNotificationTokens(uid: string) {
    return this.userRepository.removeNotificationTokens(uid);
  }

  checkIfUserIsSubscriber(id: string, locationId: string, uid: string) {
    if (id !== uid) throw new BadRequestException('Invalid uid');
    return this.userRepository.checkIfUserIsSubscriber(id, locationId);
  }

  findAll() {
    return this.userRepository.find();
  }

  findByEmail(email: string) {
    return this.userRepository.findByEmail(email);
  }

  findByGoogleId(googleId: string) {
    return this.userRepository.findByGoogleId(googleId);
  }

  async findById(id: string) {
    return this.userRepository.findById(id);
  }

  async findOrCreateGoogleUser(googleUser: {
    googleId: string;
    email: string;
    firstName: string;
    lastName: string;
  }) {
    let user = await this.findByGoogleId(googleUser.googleId);
    if (user) {
      return user;
    }

    user = await this.findByEmail(googleUser.email);
    if (user) {
      return this.userRepository.findByIdAndUpdate(user._id.toString(), {
        googleId: googleUser.googleId,
      });
    }

    return this.userRepository.create({
      email: googleUser.email,
      password: '',
      isActive: true,
      googleId: googleUser.googleId,
      firstName: googleUser.firstName,
      lastName: googleUser.lastName,
    } as any);
  }

  async addFavoriteLocation(userId: string, locationId: string) {
    return this.userRepository.addFavoriteLocation(userId, locationId);
  }

  async removeFavoriteLocation(userId: string, locationId: string) {
    return this.userRepository.removeFavoriteLocation(userId, locationId);
  }

  async getFavoriteLocationIds(userId: string): Promise<string[]> {
    return this.userRepository.getFavoriteLocationIds(userId);
  }

  async findUsersByFavoriteLocation(locationId: string) {
    return this.userRepository.findUsersByFavoriteLocation(locationId);
  }
}
