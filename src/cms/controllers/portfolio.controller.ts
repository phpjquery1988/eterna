import { Body, Controller, Get, Post, Param, Delete, Put, Query, UseGuards, Request } from '@nestjs/common';
import { PortfolioService } from '../services/portfolio.service';
import { CreatePortfolioDto } from '../dto/portfolio/create.portfolio.dto';
import { GetAllById, ObjectIdDto, PaginationDto } from '../dto/common.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { RolesGuard } from 'src/auth/guards/roles-guard';
import { UserRoleEnum } from '@app/contracts';
import { Request as ReqObj } from 'express';
import { User } from 'src/users/model/user.model';


@Controller('v1/portfolio')
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRoleEnum.Admin, UserRoleEnum.Employee)
export class PortfolioController {
   constructor(private readonly portfolioService: PortfolioService) { }

   @Post()
   async createPortfolio(@Body() createPortfolioDto: CreatePortfolioDto, @Request() req: ReqObj) {
      const user = req.user as User;
      const npn = user.userName;
      return this.portfolioService.create(createPortfolioDto, npn);
   }

   @Get("all")
   async getAllPortfolios(@Query() paginationDto: PaginationDto, @Request() req: ReqObj) {
      const user = req.user as User;
      const npn = user.userName;
      return this.portfolioService.findAll(paginationDto, npn);
   }

   @Get('by-user')
   async getPortfoliosByUserId(@Request() req: ReqObj) {
      const user = req.user as User;
      const npn = user.userName;
      return this.portfolioService.findByUserId(npn);
   }

   @Get()
   async getPortfolioById(@Query() objectIdDto: ObjectIdDto) {
      return this.portfolioService.findById(objectIdDto.id);
   }

   @Delete()
   async deletePortfolio(@Query() objectIdDto: ObjectIdDto, @Request() req: ReqObj) {
      const user = req.user as User;
      const npn = user.userName;
      return this.portfolioService.deleteById(objectIdDto.id, npn);
   }

   @Put()
   async updatePortfolio(@Query() objectIdDto: ObjectIdDto, @Body() updatePortfolioDto: CreatePortfolioDto, @Request() req: ReqObj) {
      const user = req.user as User;
      const npn = user.userName;
      return this.portfolioService.updateById(objectIdDto.id, updatePortfolioDto, npn);
   }
}
