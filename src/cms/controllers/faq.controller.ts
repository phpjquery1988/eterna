import { Body, Controller, Get, Post, Param, Delete, Query, Put, UseGuards, Request } from '@nestjs/common';
import { FAQService } from '../services/faq.service';
import { CreateFAQDto } from '../dto/faq/create-faq';
import { GetAllById, ObjectIdDto, PaginationDto } from '../dto/common.dto';
import { UserRoleEnum } from '@app/contracts';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { RolesGuard } from 'src/auth/guards/roles-guard';
import { Request as ReqObj } from 'express';
import { User } from 'src/users/model/user.model';

@Controller('v1/faq')
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRoleEnum.Admin, UserRoleEnum.Employee)
export class FAQController {
   constructor(private readonly faqService: FAQService) { }

   @Post()
   async createFAQ(@Body() createFAQDto: CreateFAQDto, @Request() req: ReqObj) {
      const user = req.user as User;
      const npn = user.userName;
      return this.faqService.create(createFAQDto, npn);
   }

   @Get("all")
   async getAllFAQs(@Query() paginationDto: PaginationDto, @Request() req: ReqObj) {
      const user = req.user as User
      const npn = user.userName
      return this.faqService.findAll(paginationDto, npn);
   }

   @Get('by-category')
   async getFAQsByCategory(@Query('category') category: string) {
      return this.faqService.findByCategory(category);
   }

   @Get('by-agent')
   async getFAQsByUserId(@Request() req: ReqObj) {
      const user = req.user as User
      const npn = user.userName
      return this.faqService.findByUserId(npn);
   }

   @Get()
   async getFAQById(@Query() objectIdDto: ObjectIdDto) {
      return this.faqService.findById(objectIdDto.id);
   }

   @Delete()
   async deleteFAQ(@Query() objectIdDto: ObjectIdDto, @Request() req: ReqObj) {
      const user = req.user as User
      const npn = user.userName
      return this.faqService.deleteById(objectIdDto.id, npn);
   }

   @Put()
   async updateFAQ(@Query() objectIdDto: ObjectIdDto, @Body() updateFAQDto: Partial<CreateFAQDto>, @Request() req: ReqObj) {
      const user = req.user as User
      const npn = user.userName
      return this.faqService.updateById(objectIdDto.id, updateFAQDto, npn);
   }
}
