import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Testimonial } from '../entities/testimonials.schema';
import { CreateTestimonialDto } from '../dto/testimonials/create-testimonials.dto';
import { GetAllById, PaginationDto } from '../dto/common.dto';
import { AgentProfile } from '../entities/profile.schema';

@Injectable()
export class TestimonialsService {
   constructor(
      @InjectModel(Testimonial.name) private testimonialModel: Model<Testimonial>,
      @InjectModel(AgentProfile.name) private agentProfileModel: Model<AgentProfile>,
   ) { }

   async create(createTestimonialDto: CreateTestimonialDto): Promise<Testimonial> {
      const agentProfile = await this.agentProfileModel.findById(createTestimonialDto.agentProfile);
      if (!agentProfile) {
         throw new NotFoundException('Agent profile not found');
      }
      const testimonial = new this.testimonialModel(createTestimonialDto);
      return testimonial.save();
   }

   async findAll(pagination: GetAllById): Promise<Testimonial[]> {
      const profile = await this.agentProfileModel.findById(pagination.id);
      if (!profile) {
         throw new NotFoundException('Agent profile not found');
      }
      const skip = (pagination.page - 1) * pagination.limit || 0;
      const limit = pagination.limit ? pagination.limit : 10;
      return this.testimonialModel.find({
         agentProfile: pagination.id
      }).limit(limit).skip(skip).exec();
   }

   async findById(id: string): Promise<Testimonial> {
      return this.testimonialModel.findById(id).exec();
   }

   async deleteById(id: string): Promise<Testimonial> {
      return this.testimonialModel.findByIdAndDelete(id).exec();
   }

   async updateById(id: string, updateTestimonialDto: Partial<CreateTestimonialDto>): Promise<Testimonial> {
      return await this.testimonialModel.findOneAndUpdate(
         { _id: id },
         { $set: updateTestimonialDto },
         { new: true }
      ).exec();
   }
}
