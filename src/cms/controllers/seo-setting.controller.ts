import { Body, Controller, Get, Post, Delete, Query, Put, UseGuards, Request } from '@nestjs/common';
import { SeoSettingsService } from '../services/seo-settings.service';
import { CreateSeoSettingsDto } from '../dto/seo-settings/create-seo-settings';
import { GetAllById, ObjectIdDto, PaginationDto } from '../dto/common.dto';
import { RolesGuard } from 'src/auth/guards/roles-guard';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { UserRoleEnum } from '@app/contracts';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Request as ReqObj } from 'express';
import { User } from 'src/users/model/user.model';

@Controller('v1/seo-settings')
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRoleEnum.Admin, UserRoleEnum.Employee)
export class SeoSettingsController {
   constructor(private readonly seoSettingsService: SeoSettingsService
   ) { }

   @Post()
   async createSeoSettings(@Body() createSeoSettingsDto: CreateSeoSettingsDto, @Request() req: ReqObj) {
      const user = req.user as User;
      const npn = user.userName

      return this.seoSettingsService.create(createSeoSettingsDto, npn);
   }

   @Get('all')
   async getAllSeoSettings(@Query() pagination: PaginationDto, @Request() req: ReqObj) {
      const user = req.user as User;
      const npn = user.userName
      return this.seoSettingsService.findAll(pagination, npn);
   }

   @Get('by-agent')
   async getSeoSettingsByUserId(@Query() objectIdDto: ObjectIdDto, @Request() req: ReqObj) {
      const user = req.user as User;
      const npn = user.userName
      return this.seoSettingsService.findByUserId(objectIdDto.id, npn);
   }

   @Get()
   async getSeoSettingsById(@Query() objectIdDto: ObjectIdDto, @Request() req: ReqObj) {
      const user = req.user as User;
      const npn = user.userName
      return this.seoSettingsService.findById(objectIdDto.id, npn);
   }

   @Delete()
   async deleteSeoSettings(@Query() objectIdDto: ObjectIdDto, @Request() req: ReqObj) {
      const user = req.user as User;
      const npn = user.userName
      return this.seoSettingsService.deleteById(objectIdDto.id, npn);
   }

   @Put()
   async updateSeoSettings(@Query() objectIdDto: ObjectIdDto, @Body() updateSeoSettingsDto: Partial<CreateSeoSettingsDto>, request: ReqObj) {
      const user = request.user as User
      const npn = user.userName
      return this.seoSettingsService.updateById(objectIdDto.id, updateSeoSettingsDto, npn)
   }
}
