import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UserRepository } from './user.repository';
import { ClientSession } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

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
        password: encryptedPassword,
      },
      session,
    );
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
