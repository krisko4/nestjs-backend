import { Controller, Post, Body } from '@nestjs/common';
import { RegistrationService } from './registration.service';
import { CreateUserDto } from 'src/user/dto/create-user.dto';

@Controller('registration')
export class RegistrationController {
  constructor(private readonly registrationService: RegistrationService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.registrationService.registerUser(createUserDto);
  }
}
