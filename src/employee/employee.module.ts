import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Employee, EmployeeSchema } from './entities/employee.schema';
import {
  EmployeeHierarchy,
  EmployeeHierarchySchema,
} from './entities/employee.herarchy.schema';
import { Policy, PolicySchema } from './entities/policy.schema';
import { License, LicenseSchema } from './entities/license.schema';
import { LicenseController } from './controllers/license.controller';
import { StaticData, StaticDataSchema } from './entities/static.schema';
import { EarningController } from './controllers/earning.controller';
import { EmployeeController } from './controllers/employee.controller';
import { EmployeeService } from './services/employee.service';
import { UploadController } from './controllers/upload.controller';
import { UploadService } from './services/upload.service';
import { UsersService } from 'src/users/services/users.service';
import { User, UserSchema } from 'src/users/model/user.model';
import { LoginRecordsService } from 'src/users/services/login-records.service';
import { IdentitiesService } from 'src/auth/services/identities.service';
import {
  LoginRecord,
  LoginRecordSchema,
} from 'src/users/model/login-record.model';
import { IpLocationService } from 'src/users/services/iplocation.service';
import { Identity, IdentitySchema } from 'src/auth/model/identity.model';
import { HttpService } from '@nestjs/axios';
import { HttpModule } from '@nestjs/axios';
import { UsersModule } from 'src/users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IAuthConfig } from 'config/model';
import {
  RefreshToken,
  RefreshTokenSchema,
} from 'src/auth/model/refresh-token.model';
import {
  AgentProfile,
  AgentProfileSchema,
} from 'src/cms/entities/profile.schema';
import {
  AgentHierarchy,
  AgentHierarchySchema,
} from './entities/csv-uplao/agents.employee.schema';
import { LicenseService } from './services/license.service';
import { S3Service } from './services/s3.service';
import { DateService } from './services/date.service';
import { ExportController } from './controllers/export.controller';
import { ExportService } from './services/export.service';
import { Carrier, CarrierSchema } from './entities/carrier.schema';
import { CarrierService } from './services/carrier.service';
import { CarrierController } from './controllers/carrier.controller';
import { PolicyService } from './services/policy.service';
import { CompensationService } from './services/compensations.service';
import {
  Compensation,
  CompensationSchema,
} from './entities/compensation.schema';
import { CompensationController } from './controllers/compensation.controller';
import { EmployeeProfileController } from './controllers/employee.profile.controller';
import { EmployeeProfileService } from './services/employee.profile.service';
import { StateService } from './services/state.service';
import {
  EmployeeProfile,
  EmployeeProfileSchema,
} from './entities/employee.profile.schema';
import {
  EmployeeProfileAudit,
  EmployeeProfileAuditSchema,
} from './entities/employee.profile-audit.schema';
import { ContractingService } from './services/contracting.service';
import { Contracting } from './entities/contracting.schema';
import { ContractingSchema } from './entities/contracting.schema';
import { ContractingController } from './controllers/contracting.controller';
import { ContractingProducts } from './entities/contracting-products.schema';
import { ContractingProductsSchema } from './entities/contracting-products.schema';
import { BookOfBusinessService } from './services/book-of-business.service';
import { BookOfBusinessPolicy } from './entities/book-of-business-policy.schema';
import { BookOfBusinessPolicySchema } from './entities/book-of-business-policy.schema';
import { BookOfBusinessTakeAction } from './entities/book-of-business-take-action.schema';
import { BookOfBusinessTakeActionSchema } from './entities/book-of-business-take-action.schema';
import { BookOfBusinessController } from './controllers/book-of-business.controller';
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
            expiresIn: authConfig.jwtExpirationTime,
          },
        };
      },
    }),
    HttpModule,
    MongooseModule.forFeature([
      { name: Employee.name, schema: EmployeeSchema },
      { name: EmployeeHierarchy.name, schema: EmployeeHierarchySchema },
      { name: Policy.name, schema: PolicySchema },
      { name: License.name, schema: LicenseSchema },
      { name: StaticData.name, schema: StaticDataSchema },
      { name: User.name, schema: UserSchema },
      { name: LoginRecord.name, schema: LoginRecordSchema },
      { name: Identity.name, schema: IdentitySchema },
      { name: RefreshToken.name, schema: RefreshTokenSchema },
      { name: AgentProfile.name, schema: AgentProfileSchema },
      { name: AgentHierarchy.name, schema: AgentHierarchySchema },
      { name: Carrier.name, schema: CarrierSchema },
      { name: Compensation.name, schema: CompensationSchema },
      { name: EmployeeProfile.name, schema: EmployeeProfileSchema },
      { name: EmployeeProfileAudit.name, schema: EmployeeProfileAuditSchema },
      { name: Contracting.name, schema: ContractingSchema },
      { name: ContractingProducts.name, schema: ContractingProductsSchema },
      { name: BookOfBusinessPolicy.name, schema: BookOfBusinessPolicySchema },
      {
        name: BookOfBusinessTakeAction.name,
        schema: BookOfBusinessTakeActionSchema,
      },
    ]),
  ],
  controllers: [
    EmployeeController,
    LicenseController,
    EarningController,
    UploadController,
    ExportController,
    CarrierController,
    CompensationController,
    EmployeeProfileController,
    ContractingController,
    BookOfBusinessController,
  ],
  providers: [
    LicenseService,
    EmployeeService,
    UploadService,
    DateService,
    UsersService,
    LoginRecordsService,
    IdentitiesService,
    IpLocationService,
    S3Service,
    ExportService,
    CarrierService,
    PolicyService,
    CompensationService,
    EmployeeProfileService,
    StateService,
    ContractingService,
    BookOfBusinessService,
  ],
})
export class EmployeeModule {}
