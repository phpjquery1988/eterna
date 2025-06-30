import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from '../config';
import { MongooseModule } from '@nestjs/mongoose';
import { IAppConfig, IDbConfig } from 'config/model';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { SharedModule } from './shared/shared.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { APP_GUARD } from '@nestjs/core';
import { DashboardModule } from './dashboard/dashboard.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TasksModule } from './tasks/tasks.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { EmployeeModule } from './employee/employee.module';
import { HealthModule } from './health.module';
import { CmsModule } from './cms/cms.module';
import { TokenModule } from './auth-user/model/token.model';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    MongooseModule.forRootAsync({
      imports: [],
      useFactory: (configService: ConfigService) => {
        const dbConfig = configService.get<IDbConfig>('db');
        const dbUri = dbConfig.mongoUri;
        console.log(dbUri)
        if (!dbUri || dbUri === '') {
          throw new Error('MONGO_URI not set');
        }
        return {
          uri: dbUri,
        };
      },
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot([
      {
        name: 'medium', // 20 calls in 10 seconds
        ttl: 10000,
        limit: 20,
      },
    ]),
    ServeStaticModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const appConfig = configService.get<IAppConfig>('app');
        return [
          {
            rootPath: appConfig.uploadsDir,
            serveRoot: '/v1/uploads',
          },
        ];
      },
      inject: [ConfigService],
    }),
    // SharedModule,
    AuthModule,
    UsersModule,
    // DashboardModule,
    // NotificationsModule,
    // TasksModule,
    TokenModule,
    EmployeeModule,
    HealthModule,
    CmsModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
