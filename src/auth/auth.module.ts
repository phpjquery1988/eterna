import { RefreshToken, RefreshTokenSchema } from './model/refresh-token.model';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { LocalUsernamePasswordStrategy } from './strategies/local-username-password.strategy';
import { UsersModule } from '../users/users.module';
import { Module, forwardRef } from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { IAuthConfig } from '../../config/model';
import { RolesGuard } from './guards/roles-guard';
import { Identity, IdentitySchema } from './model/identity.model';
import { IdentitiesService } from './services/identities.service';
import { AuthController } from './controllers/auth.controller';
import { IdentitiesController } from './controllers/identities.controller';
import { TwilioService } from './services/twilio-auth.service';

@Module({
  imports: [
    forwardRef(() => UsersModule),
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const authConfig: IAuthConfig = configService.get('auth');
        return {
          secret: authConfig.jwtSecret,
          signOptions: {
            expiresIn: authConfig.jwtExpirationTime, // if string then miliseconds
          },
        };
      },
    }),
    MongooseModule.forFeatureAsync([
      { name: RefreshToken.name, useFactory: () => RefreshTokenSchema },
      { name: Identity.name, useFactory: () => IdentitySchema },
    ]),
  ],
  controllers: [AuthController, IdentitiesController],
  providers: [
    AuthService,
    LocalUsernamePasswordStrategy,
    JwtStrategy,
    RolesGuard,
    IdentitiesService,
    TwilioService,
  ],
  exports: [AuthService, IdentitiesService],
})
export class AuthModule {}
