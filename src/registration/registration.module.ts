import { Module } from '@nestjs/common';
import { RegistrationService } from './registration.service';
import { RegistrationController } from './registration.controller';
import {
  ConfirmationToken,
  ConfirmationTokenSchema,
} from './schemas/confirmation.token';
import { ConfirmationTokenRepository } from './confirmation.token.repository';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from 'src/user/user.module';
import { EmployeeModule } from 'src/employee/employee.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ConfirmationToken.name, schema: ConfirmationTokenSchema },
    ]),
    UserModule,
    EmployeeModule,
  ],
  controllers: [RegistrationController],
  providers: [RegistrationService, ConfirmationTokenRepository],
})
export class RegistrationModule {}
