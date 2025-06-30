import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  CreateLicenseDto,
  CreateStaticDataDto,
  getLicenseDto,
  LicenseFilterDto,
  ObjectIdDto,
  UpdateLicenseDto,
} from '../dto/license.dto';
import { ApiTags } from '@nestjs/swagger';
import { StaticData } from '../entities/static.schema';
import { EmployeeService } from '../services/employee.service';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { RolesGuard } from 'src/auth/guards/roles-guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRoleEnum } from '@app/contracts';
import { Request as ReqObj } from 'express';
import { ContractingService } from '../services/contracting.service';

@Controller('v1/contracting')
@ApiTags('contracting')
//@UseGuards(JwtGuard, RolesGuard)
//@Roles(UserRoleEnum.Admin, UserRoleEnum.Employee)
export class ContractingController {
  constructor(private readonly contractingService: ContractingService) {}

  @Get()
  get(@Query() licenseFilterDto: LicenseFilterDto) {
    return this.contractingService.getContractings(licenseFilterDto);
  }

  @Get('products')
  getProducts(@Query() filter: any) {
    return this.contractingService.getContractingProducts(
      filter.npn,
      filter.carrier,
    );
  }
}
