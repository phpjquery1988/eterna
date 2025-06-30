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
import { LicenseService } from '../services/license.service';

@Controller('v1/licenses')
@ApiTags('licenses')
//@UseGuards(JwtGuard, RolesGuard)
//@Roles(UserRoleEnum.Admin, UserRoleEnum.Employee)
export class LicenseController {
  constructor(
    private readonly employeeService: EmployeeService,
    private readonly licenseService: LicenseService,
  ) {}

  @Get()
  get(@Query() licenseFilterDto: LicenseFilterDto) {
    return this.licenseService.getLicenses(licenseFilterDto);
  }

  // @Get('all-by-npn')
  // findAllByNpn(@Query() getLicenseDto: getLicenseDto, @Request() req: ReqObj) {
  //    const user = req.user as any;
  //    const isAdmin = user.role === UserRoleEnum.Admin;
  //    const npn = isAdmin ? getLicenseDto.npn : user.userName;
  //    return this.licenseService.findAllLicenseByNpn(npn, getLicenseDto, isAdmin);
  // }

  @Get('count-of-status')
  countByStatus(@Query() getLicenseDto: getLicenseDto, @Request() req: ReqObj) {
    const user = req.user as any;
    const isAdmin = user.role === UserRoleEnum.Admin;
    const npn = isAdmin ? getLicenseDto.npn : user.userName;
    return this.employeeService.countLicensesByStatus(
      npn,
      getLicenseDto,
      isAdmin,
    );
  }

  // @Get('all')
  // findAll(@Query() getLicenseDto: getLicenseDto, @Request() req: ReqObj) {
  //    const user = req.user as User;
  //    const isAdmin = user.role === UserRoleEnum.Admin;
  //    const npn = user.userName
  //    return this.licenseService.findAllLicense(getLicenseDto, isAdmin, npn);

  // }

  @Get('single')
  findOne(@Query() objectIdDto: ObjectIdDto) {
    const { id } = objectIdDto;
    return this.employeeService.findOneLicense(id);
  }

  @Put()
  update(
    @Query() objectIdDto: ObjectIdDto,
    @Body() updateLicenseDto: UpdateLicenseDto,
  ) {
    const { id } = objectIdDto;
    return this.employeeService.updateLicense(id, updateLicenseDto);
  }

  @Delete()
  remove(@Query() objectIdDto: ObjectIdDto) {
    const { id } = objectIdDto;
    return this.employeeService.removeLicense(id);
  }

  @Post('static-data')
  @Roles(UserRoleEnum.Admin)
  async createOrUpdateStaticData(
    @Body() body: CreateStaticDataDto,
    @Query('keepOld') keepOld: string,
  ): Promise<StaticData> {
    const keepOldFlag = keepOld === 'true';
    return this.employeeService.createOrUpdateStaticData(body, keepOldFlag);
  }

  // get static data
  @Get('static-data')
  async getStaticData(): Promise<StaticData> {
    return this.employeeService.getStaticData();
  }
}
