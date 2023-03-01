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
import { UpdateUserDto } from './dto/update-user.dto';
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
    console.log(img[0]);
    console.log(img[0].path);
    const logoId = await this.cloudinaryService.uploadImage(
      img[0].path,
      'user_images',
    );
    console.log('uploaded');
    this.userRepository.updateProfilePicture(uid, logoId);
  }

  setNotificationToken(id: string, updateUserDto: UpdateUserDto) {
    const { notificationToken } = updateUserDto;
    return this.userRepository.setNotificationToken(id, notificationToken);
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

  async findById(id: string) {
    return this.userRepository.findById(id);
  }
}
