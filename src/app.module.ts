import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BusinessTypeModule } from './business-type/business-type.module';
import { NewsModule } from './news/news.module';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { RegistrationModule } from './registration/registration.module';
import { VisitModule } from './visit/visit.module';

@Module({
  imports: [
    BusinessTypeModule,
    NewsModule,
    DatabaseModule,
    ConfigModule.forRoot({ isGlobal: true }),
    UserModule,
    AuthModule,
    RegistrationModule,
    VisitModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
