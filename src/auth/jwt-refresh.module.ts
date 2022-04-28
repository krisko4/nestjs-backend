import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('REFRESH_TOKEN_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  providers: [
    {
      provide: 'JwtRefreshService',
      useExisting: JwtService,
    },
  ],
  exports: ['JwtRefreshService'],
})
export class JwtRefreshModule {}
