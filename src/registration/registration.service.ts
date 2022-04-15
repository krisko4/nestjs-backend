import { Injectable } from '@nestjs/common';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { UserService } from 'src/user/user.service';
import { ConfirmationTokenRepository } from './confirmation.token.repository';
import { v4 as uuidv4 } from 'uuid';
import { addMinutes } from 'date-fns';
import mongoose, { ClientSession } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { ConfirmationTokenDocument } from './schemas/confirmation.token';

@Injectable()
export class RegistrationService {
  constructor(
    private readonly userService: UserService,
    private readonly confirmationTokenRepository: ConfirmationTokenRepository,
    @InjectConnection() private readonly connection: mongoose.Connection,
  ) {}
  async registerUser(createUserDto: CreateUserDto) {
    const session = await this.connection.startSession();
    let token: ConfirmationTokenDocument;
    await session.withTransaction(async () => {
      const user = await this.userService.create(createUserDto, session);
      token = await this.createConfirmationToken(user._id, session);
    });
    await session.endSession();
    return token;
  }
  async createConfirmationToken(userId: string, session: ClientSession) {
    const createdAt = new Date();
    const expiresAt = addMinutes(createdAt, 10);
    const token = {
      value: uuidv4(),
      createdAt,
      expiresAt,
      userId,
    };
    console.log(token);
    return this.confirmationTokenRepository.create(token, session);
  }
}
