import { Body, Controller, Get, Post, Param, Delete, Query, Put, UseGuards } from '@nestjs/common';
import { TestimonialsService } from '../services/testimonials.service';
import { CreateTestimonialDto } from '../dto/testimonials/create-testimonials.dto';
import { GetAllById, ObjectIdDto } from '../dto/common.dto';


@Controller('v1/testimonials')
export class TestimonialsController {
   constructor(private readonly testimonialsService: TestimonialsService) { }

   @Post()
   async createTestimonial(@Body() createTestimonialDto: CreateTestimonialDto) {
      return this.testimonialsService.create(createTestimonialDto);
   }

   @Get("all")
   async getAllTestimonials(@Query() paginationDto: GetAllById) {
      return this.testimonialsService.findAll(paginationDto);
   }

   @Put()
   async updateTestimonial(@Query() objectIdDto: ObjectIdDto, @Body() updateTestimonialDto: Partial<CreateTestimonialDto>) {
      return this.testimonialsService.updateById(objectIdDto.id, updateTestimonialDto);
   }

   @Get()
   async getTestimonialById(@Query() objectIdDto: ObjectIdDto) {
      return this.testimonialsService.findById(objectIdDto.id);
   }

   @Delete()
   async deleteTestimonial(@Query() objectIdDto: ObjectIdDto) {
      return this.testimonialsService.deleteById(objectIdDto.id);
   }
}
