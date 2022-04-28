import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('ACCESS_TOKEN_SECRET'),
        signOptions: { expiresIn: '10s' },
      }),
    }),
  ],
  providers: [
    {
      provide: 'JwtAccessService',
      useExisting: JwtService,
    },
  ],
  exports: ['JwtAccessService'],
})
export class JwtAccessModule {}
