import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { assertJwtSecretIsAcceptable } from '../config/security';

function positiveInteger(name: string, raw: string): number {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer (got "${raw}").`);
  }
  return value;
}

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.getOrThrow<string>('JWT_SECRET');
        assertJwtSecretIsAcceptable(secret, { NODE_ENV: configService.get<string>('NODE_ENV') });
        return { secret, signOptions: { expiresIn: '7d' } };
      },
    }),
    // Rate limit applied to the authentication endpoints only (see AuthController).
    // Counters are per client address and per route, kept in memory by each server instance.
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          limit: positiveInteger('AUTH_RATE_LIMIT', configService.get<string>('AUTH_RATE_LIMIT', '10')),
          ttl: positiveInteger('AUTH_RATE_WINDOW_SEC', configService.get<string>('AUTH_RATE_WINDOW_SEC', '60')) * 1000,
        },
      ],
    }),
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}
