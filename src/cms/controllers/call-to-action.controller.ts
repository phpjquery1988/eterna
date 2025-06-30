import { Body, Controller, Get, Post, Param, Delete, Query, Put, UseGuards, Request } from '@nestjs/common';
import { CallToActionService } from '../services/call-to-action.service';
import { CreateCallToActionDto } from '../dto/portfolio/call-to-action/create-call-to-action';
import { GetAllById, ObjectIdDto, PaginationDto } from '../dto/common.dto';
import { UserRoleEnum } from '@app/contracts';
import { RolesGuard } from 'src/auth/guards/roles-guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { Request as ReqObj } from 'express';
import { User } from 'src/users/model/user.model';


@Controller('v1/call-to-action')
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRoleEnum.Admin, UserRoleEnum.Employee)
export class CallToActionController {
   constructor(private readonly callToActionService: CallToActionService) { }

   @Post()
   async createCallToAction(@Body() createCallToActionDto: CreateCallToActionDto, @Request() req: ReqObj) {
      const user = req.user as User;
      const npn = user.userName;
      return this.callToActionService.create(createCallToActionDto, npn);
   }

   @Get("all")
   async getAllCallToActions(@Query() paginationDto: PaginationDto, @Request() req: ReqObj) {
      const user = req.user as User;
      const npn = user.userName;
      return this.callToActionService.findAll(paginationDto, npn);
   }

   @Get('by-profile')
   async getCallToActionsByUserId(@Request() req: ReqObj, @Query() paginationDto: PaginationDto) {
      const user = req.user as User;
      const npn = user.userName;
      return this.callToActionService.findByUserId(npn, paginationDto);
   }

   @Get()
   async getCallToActionById(@Query() objectIdDto: ObjectIdDto) {
      return this.callToActionService.findById(objectIdDto.id);
   }

   @Delete()
   async deleteCallToAction(@Query() objectIdDto: ObjectIdDto, @Request() req: ReqObj) {
      const user = req.user as User;
      const npn = user.userName;
      return this.callToActionService.deleteById(objectIdDto.id, npn);
   }

   @Put()
   async updateCallToAction(@Query() objectIdDto: ObjectIdDto, @Body() updateCallToActionDto: Partial<CreateCallToActionDto>, @Request() req: ReqObj) {
      const user = req.user as User;
      const npn = user.userName;
      return this.callToActionService.updateById(objectIdDto.id, updateCallToActionDto, npn);
   }
}
