import { Body, Controller, Get, Post, Param, Delete, Query, Put, UseGuards, Request } from '@nestjs/common';
import { GalleryService } from '../services/gallery.service';
import { CreateGalleryDto } from '../dto/gallery/create-gallery.dto';
import { GetAllById, ObjectIdDto, PaginationDto } from '../dto/common.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { RolesGuard } from 'src/auth/guards/roles-guard';
import { UserRoleEnum } from '@app/contracts';
import { Request as ReqObj } from 'express';
import { User } from 'src/users/model/user.model';


@Controller('v1/gallery')
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRoleEnum.Admin, UserRoleEnum.Employee)
export class GalleryController {
   constructor(private readonly galleryService: GalleryService) { }

   @Post()
   async createGallery(@Body() createGalleryDto: CreateGalleryDto, @Request() req: ReqObj) {
      const user = req.user as User
      const npn = user.userName
      return this.galleryService.create(createGalleryDto, npn);
   }

   @Get("all")
   async getAllGalleries(@Query() paginationDto: PaginationDto, @Request() req: ReqObj) {
      const user = req.user as User
      const npn = user.userName
      return this.galleryService.findAll(paginationDto, npn);
   }

   @Get('by-agent')
   async getGalleriesByUserId(@Request() req: ReqObj) {
      const user = req.user as User
      const npn = user.userName
      return this.galleryService.findByUserId(npn);
   }

   @Get()
   async getGalleryById(@Query() objectIdDto: ObjectIdDto) {
      return this.galleryService.findById(objectIdDto.id);
   }

   @Delete()
   async deleteGallery(@Query() objectIdDto: ObjectIdDto, @Request() req: ReqObj) {
      const user = req.user as User
      const npn = user.userName
      return this.galleryService.deleteById(objectIdDto.id, npn);
   }

   @Put()
   async updateGallery(@Query() objectIdDto: ObjectIdDto, @Body() updateGalleryDto: Partial<CreateGalleryDto>, @Request() req: ReqObj) {
      const user = req.user as User
      const npn = user.userName
      return this.galleryService.updateById(objectIdDto.id, updateGalleryDto, npn);
   }
}
