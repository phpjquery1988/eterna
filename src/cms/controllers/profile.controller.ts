import { Controller, Get, Post, Body, Put, Query, UseGuards, Request } from '@nestjs/common';
import { CmsService } from '../services/profile.service';
import { CreateAgentProfileDto } from '../dto/profile/create-profile.dto';
import { ObjectIdDto, PaginationDto } from '../dto/common.dto';
import { RolesGuard } from 'src/auth/guards/roles-guard';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { UserRoleEnum } from '@app/contracts';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Request as ReqObj } from 'express';
import { User } from 'src/users/model/user.model';

@Controller('v1/profile')
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRoleEnum.Admin, UserRoleEnum.Employee)
export class CmsController {
  constructor(private readonly cmsService: CmsService) { }

  @Post()
  create(@Body() createProfileDto: CreateAgentProfileDto) {
    return this.cmsService.create(createProfileDto);
  }

  @Get()
  findOne(@Query() objectIdDto: ObjectIdDto, @Request() req: ReqObj) {
    const user = req.user as User;
    const npn = user.userName;
    return this.cmsService.findOne(objectIdDto.id, npn);
  }

  @Put()
  update(@Query() objectIdDto: ObjectIdDto, @Body() updateProfileDto: Partial<CreateAgentProfileDto>, @Request() req: ReqObj) {
    const user = req.user as User;
    const npn = user.userName;
    return this.cmsService.update(objectIdDto.id, updateProfileDto, npn);
  }

  // get all profiles
  @Get('all')
  findAll(@Query() paginationDto: PaginationDto, @Request() req: ReqObj) {
    const user = req.user as User;
    const npn = user.userName;
    return this.cmsService.findAll(paginationDto, npn);
  }
}
