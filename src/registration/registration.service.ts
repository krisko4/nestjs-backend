import { Injectable } from '@nestjs/common';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { UserService } from 'src/user/user.service';
import { ConfirmationTokenRepository } from './confirmation.token.repository';
import { v4 as uuidv4 } from 'uuid';
import { addMinutes } from 'date-fns';
import mongoose, { ClientSession } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { ConfirmationTokenDocument } from './schemas/confirmation.token';
import { EmployeeService } from 'src/employee/employee.service';
import { AuthService } from 'src/auth/auth.service';

@Injectable()
export class RegistrationService {
  constructor(
    private readonly userService: UserService,
    private readonly confirmationTokenRepository: ConfirmationTokenRepository,
    private readonly employeeService: EmployeeService,
    private readonly authService: AuthService,
    @InjectConnection() private readonly connection: mongoose.Connection,
  ) {}
  async registerUser(createUserDto: CreateUserDto) {
    const session = await this.connection.startSession();
    let userId: string;
    await session.withTransaction(async () => {
      const user = await this.userService.create(createUserDto, session);
      userId = user._id;
      await this.employeeService.assignUserToEmployeeByEmail(
        createUserDto.email,
        user._id,
        session,
      );
    });
    await session.endSession();

    const user = await this.userService.findById(userId);
    return this.authService.login(user);
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
    return this.confirmationTokenRepository.create(token, session);
  }
}
