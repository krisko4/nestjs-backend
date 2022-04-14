import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UserDocument } from 'src/user/schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<UserDocument> {
    const user = await this.userService.findByEmail(email);
    if (!user)
      throw new NotFoundException(`User with email: ${email} not found`);
    const isPasswordValid = bcrypt.compareSync(pass, user.password);
    if (!isPasswordValid)
      throw new InternalServerErrorException('Invalid password');
    return user;
  }

  async login(user: UserDocument) {
    const payload = { email: user.email, sub: user._id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
