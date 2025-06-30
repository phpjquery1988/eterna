import { Body, Controller, Get, Post, Param, Delete, Query, Put, UseGuards, Request } from '@nestjs/common';
import { InsuranceProductService } from '../services/insurance-product.service';
import { CreateInsuranceProductDto } from '../dto/insurance-product/create.insurance-product.dto';
import { GetAllById, ObjectIdDto, PaginationDto } from '../dto/common.dto';
import { UserRoleEnum } from '@app/contracts';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { RolesGuard } from 'src/auth/guards/roles-guard';
import { Request as ReqObj } from 'express';
import { User } from 'src/users/model/user.model';


@Controller('v1/insurance-product')
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRoleEnum.Admin, UserRoleEnum.Employee)
export class InsuranceProductController {
   constructor(private readonly insuranceProductService: InsuranceProductService) { }

   @Post()
   async createInsuranceProduct(@Body() createInsuranceProductDto: CreateInsuranceProductDto, @Request() req: ReqObj) {
      const user = req.user as User
      const npn = user.userName
      return this.insuranceProductService.create(createInsuranceProductDto, npn);
   }

   @Get('all')
   async getAllInsuranceProducts(@Query() paginationDto: PaginationDto, @Request() req: ReqObj) {
      const user = req.user as User
      const npn = user.userName
      return this.insuranceProductService.findAll(paginationDto, npn);
   }

   @Get('by-agent')
   async getInsuranceProductsByUserId(@Query() objectIdDto: ObjectIdDto, @Request() req: ReqObj) {
      const user = req.user as User
      const npn = user.userName
      return this.insuranceProductService.findByUserId(npn);
   }

   @Get()
   async getInsuranceProductById(@Query() objectIdDto: ObjectIdDto) {
      return this.insuranceProductService.findById(objectIdDto.id);
   }

   @Delete()
   async deleteInsuranceProduct(@Query() objectIdDto: ObjectIdDto, @Request() req: ReqObj) {
      const user = req.user as User
      const npn = user.userName
      return this.insuranceProductService.deleteById(objectIdDto.id, npn);
   }

   @Put()
   async updateInsuranceProduct(@Query() objectIdDto: ObjectIdDto, @Body() updateInsuranceProductDto: Partial<CreateInsuranceProductDto>, @Request() req: ReqObj) {
      const user = req.user as User
      const npn = user.userName
      return this.insuranceProductService.updateById(objectIdDto.id, updateInsuranceProductDto, npn);
   }
}
