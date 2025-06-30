import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CompensationFilterDto } from '../dto/compensation.dto';
import { CompensationService } from '../services/compensations.service';
import { UserRoleEnum } from '@app/contracts';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { RolesGuard } from 'src/auth/guards/roles-guard';

@Controller('v1/compensations')
@ApiTags('compensations')
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRoleEnum.Admin, UserRoleEnum.Employee)
export class CompensationController {
  constructor(private readonly compensationService: CompensationService) {}

  @Get()
  get(@Query() licenseFilterDto: CompensationFilterDto) {
    return this.compensationService.getCompensations(licenseFilterDto);
  }
}
