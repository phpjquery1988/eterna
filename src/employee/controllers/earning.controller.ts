import { Controller, Get, Param, Request, UseGuards } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { EmployeeService } from '../services/employee.service';
import { UserRoleEnum } from '@app/contracts';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { RolesGuard } from 'src/auth/guards/roles-guard';
import { Request as ReqObj } from 'express';
import { User } from 'src/users/model/user.model';

@Controller('v1/earning')
@ApiTags('Earning')
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRoleEnum.Admin, UserRoleEnum.Employee)
export class EarningController {
   constructor(private readonly employeeService: EmployeeService) {
   }


   @Get()
   getPolicyEarning(
      @Request() req: ReqObj
   ) {
      const user = req.user as User;
      const npn = user.userName;
      return this.employeeService.getCommissionEarnings(npn);
   }


   @ApiExcludeEndpoint()
   @Get('team/commission')
   getTeamEarning(
      @Request() req: ReqObj
   ) {
      const user = req.user as User;
      const npn = user.userName;
      return this.employeeService.getTeamEarnings(npn);
   }


}
