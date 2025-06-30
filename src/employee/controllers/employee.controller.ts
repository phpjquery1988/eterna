import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  Res,
  Param,
  Patch,
  UseInterceptors,
  BadRequestException,
  UploadedFile,
} from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import {
  DateRangeDto,
  DownlineDto,
  npnDto,
  npnWithDownlineDto,
} from '../dto/date-range.dto';
import { EmployeeService } from '../services/employee.service';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { PolicyDto } from '../dto/create-policy.dto';
import { performanceStatsDto, policyDetailerDto } from '../dto/stats.dto';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { RolesGuard } from 'src/auth/guards/roles-guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRoleEnum } from '@app/contracts';
import { User } from 'src/users/model/user.model';
import { Request as ReqObj } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import * as AWS from 'aws-sdk';
import { S3Service } from '../services/s3.service';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID, // set in your .env file
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, // set in your .env file
  region: process.env.AWS_REGION, // set in your .env file
});

@Controller('v1/employee')
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRoleEnum.Admin, UserRoleEnum.Employee)
export class EmployeeController {
  constructor(
    private readonly employeeService: EmployeeService,
    private readonly s3Service: S3Service,
  ) {}

  @Post()
  @ApiExcludeEndpoint()
  @Roles(UserRoleEnum.Admin)
  create(@Body() createEmployeeDtos: CreateEmployeeDto[]) {
    return this.employeeService.create(createEmployeeDtos);
  }

  @Get('all')
  @UseGuards(JwtGuard)
  findAll(@Request() req: ReqObj) {
    const user = req.user as User;
    const npn = user.userName;
    return this.employeeService.findAll(npn);
  }

  @Get('single')
  findOne(@Request() req: ReqObj) {
    const user = req.user as User;
    const npn = user.userName;
    return this.employeeService.findOne(npn);
  }

  @Get('supervisor/detail')
  count(@Query() dateRangeDto: DateRangeDto, @Request() req: ReqObj) {
    const user = req.user as User;
    const isAdmin = user.role === UserRoleEnum.Admin;
    const npn = dateRangeDto.npn;
    const search = '' + req.query.search;
    console.log('search', search);
    return this.employeeService.getEmployeeHierarchy(
      npn,
      dateRangeDto,
      isAdmin,
      search,
    );
  }

  @Post('create-policy')
  @Roles(UserRoleEnum.Admin)
  @ApiExcludeEndpoint()
  createPolicy(@Body() createPolicyDto: PolicyDto[]) {
    return this.employeeService.createPolicy(createPolicyDto);
  }

  @Get('selfTotal')
  getPolicyStats(@Query() dateRangeDto: DateRangeDto, @Request() req: ReqObj) {
    const user = req.user as User;
    const isAdmin = user.role === UserRoleEnum.Admin;
    const npn = isAdmin ? dateRangeDto.npn : user.userName;
    let startDate = null;
    let endDate = null;
    if (dateRangeDto?.startDate || dateRangeDto?.endDate) {
      startDate = dateRangeDto.startDate;
      endDate = dateRangeDto.endDate;
    }
    return this.employeeService.getPolicyStats(npn, startDate, endDate);
  }

  @Get('total/all')
  getPolicyStatsBySupervisor(
    @Query() dateRangeDto: DateRangeDto,
    @Request() req: ReqObj,
  ) {
    const user = req.user as User;
    const isAdmin = user.role === UserRoleEnum.Admin;
    const npn = dateRangeDto.npn;
    return this.employeeService.getPolicyStatsBySupervisor(
      npn,
      dateRangeDto,
      isAdmin,
    );
  }

  @ApiExcludeEndpoint()
  @Get('supervisor/info')
  getSupervisorTotal(@Query() npnDto: npnDto, @Request() req: ReqObj) {
    const user = req.user as User;
    const IsAdmin = user.role === UserRoleEnum.Admin;
    const npn = IsAdmin ? npnDto.npn : user.userName;
    return this.employeeService.getSupervisorTotal(npn);
  }

  @Get('performance/stats')
  performanceStats(
    @Query() performanceStats: performanceStatsDto,
    @Request() req: ReqObj,
  ) {
    const user = req.user as User;
    const isAdmin = user.role === UserRoleEnum.Admin;
    const npn = performanceStats.npn;
    return this.employeeService.performanceStats(
      performanceStats,
      isAdmin,
      npn,
    );
  }

  @Get('product-wise-total-premium')
  productWiseTotalPremium(@Query() query: any) {
    return this.employeeService.productWiseTotalPremium(query);
  }

  @Get('product-wise-total-commission-premium')
  productWiseTotalCommissionPremium(@Query() query: any) {
    return this.employeeService.productWiseCommissionPremium(query);
  }

  @Get('persistency')
  async getPersistency(
    @Query() npnWithDownlineDto: npnWithDownlineDto,
    @Request() req: ReqObj,
  ) {
    const user = req.user as User;
    const isIncludeDownline = npnWithDownlineDto.includeDownline === 'true';
    const isAdmin = user.role === UserRoleEnum.Admin;
    const npn = npnWithDownlineDto.npn;
    const startDate = npnWithDownlineDto?.startDate;
    const endDate = npnWithDownlineDto?.endDate;
    return this.employeeService.calculatePersistency(
      npn,
      isIncludeDownline,
      isAdmin,
      startDate,
      endDate,
    );
  }

  @Get('persistency/agent')
  async getPersistencyAgent(
    @Query() dateRangeDto: DateRangeDto,
    @Request() req: ReqObj,
  ) {
    const user = req.user as User;
    const isAdmin = user.role === UserRoleEnum.Admin;
    const npn = isAdmin ? dateRangeDto.npn : user.userName;
    return this.employeeService.calculateDownlinePersistencyAgent(
      npn,
      dateRangeDto.startDate,
      dateRangeDto.endDate,
    );
  }

  @Get('chargeback/agent')
  async getChargeback(
    @Query() dateRangeDto: DateRangeDto,
    @Request() req: ReqObj,
  ) {
    let startDate = null;
    let endDate = null;
    if (dateRangeDto?.startDate || dateRangeDto?.endDate) {
      startDate = new Date(dateRangeDto?.startDate);
      endDate = new Date(dateRangeDto?.endDate);
    }
    const user = req.user as User;
    const isAdmin = user.role === UserRoleEnum.Admin;
    const npn = isAdmin ? dateRangeDto.npn : user.userName;
    return this.employeeService.calculateChargebacks(startDate, endDate, npn);
  }

  @Get('chargeback')
  async getChargebackAgent(
    @Query() dateRangeDto: DateRangeDto,
    @Request() req: ReqObj,
  ) {
    const user = req.user as User;
    const isAdmin = user.role === UserRoleEnum.Admin;
    const npn = dateRangeDto.npn;
    return this.employeeService.calculateChargebacksAgent(
      npn,
      dateRangeDto,
      isAdmin,
    );
  }

  @Get('policy/export')
  exportPolicies(
    @Query() policyDetailerDto: policyDetailerDto,
    @Request() req: ReqObj,
    @Res() res: Response,
  ) {
    const user = req.user as User;
    const isAdmin = user.role === UserRoleEnum.Admin;
    const npn = policyDetailerDto.npn;
    const cancelledStatusFilter = policyDetailerDto.cancelledStatusFilter;

    return this.employeeService.exportPolicies(
      npn,
      policyDetailerDto,
      isAdmin,
      cancelledStatusFilter,
      res,
    );
  }

  @Get('policy/all')
  getPolicyDetails(
    @Query() policyDetailerDto: policyDetailerDto,
    @Request() req: ReqObj,
  ) {
    const user = req.user as User;
    const isAdmin = user.role === UserRoleEnum.Admin;
    const npn = policyDetailerDto.npn;
    const cancelledStatusFilter = policyDetailerDto.cancelledStatusFilter;
    const type = policyDetailerDto.type || '';
    const search = policyDetailerDto.search;
    return this.employeeService.getPolicyDetails(
      npn,
      policyDetailerDto,
      isAdmin,
      cancelledStatusFilter,
      type,
      search,
    );
  }

  @Get('downline')
  async getPersistencyForDownline(
    @Query() downlineDto: DownlineDto,
    @Request() req: ReqObj,
  ) {
    const user = req.user as User;
    const isAdmin = user.role === UserRoleEnum.Admin;
    const npn = isAdmin ? downlineDto.npn : user.userName;
    // Only parse dates if they are provided
    const start = downlineDto.startDate
      ? new Date(downlineDto.startDate)
      : undefined;
    const end = downlineDto.endDate ? new Date(downlineDto.endDate) : undefined;

    return this.employeeService.calculateDownlinePersistency(
      npn,
      start,
      end,
      downlineDto.includeDownline,
    );
  }

  @Get('breadcrumb')
  async getBreadcrumb(@Query() npnDto: npnDto, @Request() req: ReqObj) {
    const user = req.user as User;
    const isAdmin = user.role === UserRoleEnum.Admin;
    const npn = isAdmin ? npnDto.npn : user.userName;
    return this.employeeService.getEmployeeHierarchyBreadcrumb(npn);
  }

  @Get('search')
  async search(@Query('search') search: string, @Request() req: ReqObj) {
    const user = req.user as User;
    const npn = user.userName;
    const isAdmin = user.role === UserRoleEnum.Admin;
    return this.employeeService.search(npn, isAdmin, search);
  }

  @Get('graph/agent')
  async policyStatsAgent(
    @Query() dateRangeDto: DateRangeDto,
    @Request() req: ReqObj,
  ) {
    const user = req.user as User;
    const isAdmin = user.role === UserRoleEnum.Admin;
    const npn = isAdmin ? dateRangeDto.npn : user.userName;
    return this.employeeService.policyStatsAgent(
      npn,
      dateRangeDto.startDate,
      dateRangeDto.endDate,
    );
  }

  @Get('update/hierarchy')
  async updateHierarchy() {
    return this.employeeService.updateHierarchy();
  }

  @Patch(':id')
  @UseInterceptors(
    FileInterceptor('profile', {
      storage: multer.memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
      fileFilter: (req, file, callback) => {
        // Only allow image files (jpg, jpeg, png, gif)
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
          return callback(
            new BadRequestException('Only image files are allowed!'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  public async update(
    @Param('id') id: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() updatedData: any,
  ) {
    if (file) {
      const fileName = `profiles/${id}-${Date.now()}-${file.originalname}`;
      const fileUrl = await this.s3Service.uploadFile(
        file.buffer,
        fileName,
        file.mimetype,
      );
      updatedData.avatar = fileUrl;
    }

    return this.employeeService.updateSingleEmployee(id, updatedData);
  }
}
