import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Blog } from '../entities/blog.schema';
import { CreateBlogDto } from '../dto/blog/create-blog.dto';
import { GetAllById, PaginationDto } from '../dto/common.dto';
import { AgentProfile } from '../entities/profile.schema';

@Injectable()
export class BlogService {
   constructor(
      @InjectModel(Blog.name) private blogModel: Model<Blog>,
      @InjectModel(AgentProfile.name) private agentProfileModel: Model<AgentProfile>,
   ) { }


   async create(createBlogDto: CreateBlogDto, npn: string): Promise<Blog> {
      // find the agent profile with npn of the user 
      const findAgentProfile = await this.agentProfileModel.findOne({
         npn
      });
      if (!findAgentProfile) {
         throw new NotFoundException('Agent profile not found');
      }
      const agentProfile = findAgentProfile._id;
      const blog = new this.blogModel({ ...createBlogDto, agentProfile });
      return blog.save();
   }

   async findAll(pagination: PaginationDto, npn: string): Promise<Blog[]> {
      const agentProfile = await this.agentProfileModel.findOne({
         npn
      });
      console.log("🚀 ~ BlogService ~ findAll ~ agentProfile:", agentProfile)
      if (!agentProfile) {
         throw new NotFoundException('Agent profile not found');
      }
      const skip = (pagination.page - 1) * pagination.limit || 0;
      const limit = pagination.limit ? pagination.limit : 10;
      return this.blogModel.find({
         agentProfile: agentProfile._id
      }).limit(limit).skip(skip).exec();
   }

   async findByUserId(npn: string): Promise<Blog[]> {
      const agentProfile = await this.agentProfileModel.findOne({
         npn
      });
      if (!agentProfile) {
         throw new NotFoundException('Agent profile not found');
      }
      return this.blogModel.find({ agentProfile }).exec();
   }

   async updateById(id: string, updateBlogDto: Partial<CreateBlogDto>): Promise<Blog> {
      return await this.blogModel.findOneAndUpdate(
         { _id: id },
         { $set: updateBlogDto },
         { new: true }
      ).exec();
   }

   async findById(id: string): Promise<Blog> {
      return this.blogModel.findById(id).exec();
   }

   async deleteById(id: string): Promise<Blog> {
      return this.blogModel.findByIdAndDelete(id).exec();
   }

}
