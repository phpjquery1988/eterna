import { Body, Controller, Get, Post, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { ServicesService } from '../services/service.service';
import { CreateServiceDto } from '../dto/service/create-service.dto';
import { ObjectIdDto, PaginationDto } from '../dto/common.dto';
import { RolesGuard } from 'src/auth/guards/roles-guard';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { UserRoleEnum } from '@app/contracts';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Request as ReqObj } from 'express';
import { User } from 'src/users/model/user.model';


@Controller('v1/services')
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRoleEnum.Admin, UserRoleEnum.Employee)
export class ServicesController {
   constructor(private readonly servicesService: ServicesService) { }

   @Post()
   async createService(@Body() createServiceDto: CreateServiceDto, @Request() req: ReqObj) {
      const user = req.user as User;
      const npn = user.userName
      return this.servicesService.create(createServiceDto, npn);
      
   }

   @Get("all")
   async getAllServices(@Query() paginationDto: PaginationDto, @Request() req: ReqObj) {
      const user = req.user as User;
      const npn = user.userName
      return this.servicesService.findAll(paginationDto, npn);
   }

   @Get()
   async getServiceById(@Query() objectIdDto: ObjectIdDto, @Request() req: ReqObj) {
      const user = req.user as User;
      const npn = user.userName
      return this.servicesService.findById(objectIdDto.id, npn);
   }

   @Delete()
   async deleteService(@Query() objectIdDto: ObjectIdDto, @Request() req: ReqObj) {
      const user = req.user as User;
      const npn = user.userName
      return this.servicesService.deleteById(objectIdDto.id, npn);
   }
}
