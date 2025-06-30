import { Body, Controller, Get, Post, Param, Delete, Query, Put, UseGuards, Request } from '@nestjs/common';
import { BlogService } from '../services/blog.service';
import { CreateBlogDto } from '../dto/blog/create-blog.dto';
import { GetAllById, ObjectIdDto, PaginationDto } from '../dto/common.dto';
import { UserRoleEnum } from '@app/contracts';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { RolesGuard } from 'src/auth/guards/roles-guard';
import { Request as ReqObj } from 'express';
import { User } from 'src/users/model/user.model';

@Controller('v1/blog')
@UseGuards(JwtGuard, RolesGuard)
@Roles(UserRoleEnum.Admin, UserRoleEnum.Employee)
export class BlogController {
   constructor(private readonly blogService: BlogService) { }

   @Post()
   async createBlog(@Body() createBlogDto: CreateBlogDto, @Request() req: ReqObj
   ) {
      const user = req.user as User;
      const npn = user.userName
      return this.blogService.create(createBlogDto, npn);
   }

   @Get("all")
   /**
    * Get all blogs
    * @param paginationDto - pagination options
    * @returns array of blogs
    */
   async getAllBlogs(@Query() paginationDto: PaginationDto, @Request() req: ReqObj) {
      /**
       * Gets all blogs
       * @param paginationOptions - pagination options
       * @returns array of blogs
       */
      const user = req.user as User;
      const npn = user.userName
      return this.blogService.findAll(paginationDto, npn);
   }

   @Get('by-profile')
   async getBlogsByUserId(@Request() req: ReqObj) {
      const user = req.user as User;
      const npn = user.userName
      return this.blogService.findByUserId(npn);
   }

   @Get()
   /**
    * Get a blog by id
    * @param objectIdDto - id of blog to get
    * @returns blog
    */
   async getBlogById(@Query() objectIdDto: ObjectIdDto) {
      /**
       * Gets a blog by id
       * @param id - id of blog
       * @returns blog
       */
      return this.blogService.findById(objectIdDto.id);
   }

   @Delete()
   /**
    * Delete a blog by id
    * @param objectIdDto - id of blog to delete
    * @returns deleted blog
    */
   async deleteBlog(@Query() objectIdDto: ObjectIdDto) {
      return this.blogService.deleteById(objectIdDto.id);
   }

   @Put()
   /**
    * Update a blog by id
    * @param objectIdDto - id of blog to update
    * @param updateBlogDto - partial create blog dto with updated fields
    * @returns updated blog
    */
   async updateBlog(@Query() objectIdDto: ObjectIdDto, @Body() updateBlogDto: Partial<CreateBlogDto>) {
      return this.blogService.updateById(objectIdDto.id, updateBlogDto);
   }
}
