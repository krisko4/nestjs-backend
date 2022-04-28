import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRepository } from './user.repository';
import { ClientSession } from 'mongoose';
import * as bcrypt from 'bcrypt';

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
