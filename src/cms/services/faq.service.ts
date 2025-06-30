import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FAQ } from '../entities/faq.schema';
import { CreateFAQDto } from '../dto/faq/create-faq';
import { GetAllById, PaginationDto } from '../dto/common.dto';
import { AgentProfile } from '../entities/profile.schema';

@Injectable()
export class FAQService {
  constructor(
    @InjectModel(FAQ.name) private faqModel: Model<FAQ>,
    @InjectModel(AgentProfile.name) private agentProfileModel: Model<AgentProfile>,

  ) { }

  async create(createFAQDto: CreateFAQDto, npn: string): Promise<FAQ> {
    const profile = await this.agentProfileModel.findOne({ npn });
    if (!profile) {
      throw new NotFoundException('Agent profile not found');
    }
    const faq = new this.faqModel({ ...createFAQDto, agentProfile: profile._id });
    return faq.save();
  }

  async findAll(paginationDto: PaginationDto, npn: string): Promise<FAQ[]> {
    const profile = await this.agentProfileModel.findOne({ npn });
    if (!profile) {
      throw new NotFoundException('Agent profile not found');
    }
    const skip = (paginationDto.page - 1) * paginationDto.limit || 0;
    const limit = paginationDto.limit ? paginationDto.limit : 10;
    return this.faqModel.find({
      agentProfile: profile._id,
    }).limit(limit).skip(skip).exec();
  }

  async findByCategory(category: string): Promise<FAQ[]> {
    return this.faqModel.find({ category }).exec();
  }

  async findByUserId(npn: string): Promise<FAQ[]> {
    const profile = await this.agentProfileModel.findOne({ npn });
    if (!profile) {
      throw new NotFoundException('Agent profile not found');
    }
    return this.faqModel.find({ agentProfile: profile._id }).exec();
  }

  async findById(id: string): Promise<FAQ> {
    return this.faqModel.findById(id).exec();
  }

  async deleteById(id: string, npn: string): Promise<FAQ> {
    if (npn === 'admin') {
      return this.faqModel.findByIdAndDelete(id).exec();
    }
    else {
      const profile = await this.agentProfileModel.findOne({
        npn
      })
      this.faqModel.findOneAndDelete({
        agentProfile: profile._id,
        _id: id
      })
    }
  }

  async updateById(id: string, updateFAQDto: Partial<CreateFAQDto>, npn: string): Promise<FAQ> {
    if (npn === 'admin') {
      return this.faqModel.findByIdAndUpdate(id, updateFAQDto, {
        new: true,
      }).exec();
    }
    const profile = await this.agentProfileModel.findOne({
      npn
    })
    return await this.faqModel.findOneAndDelete({
      agentProfile: profile._id,
      _id: id
    })
  }
}
