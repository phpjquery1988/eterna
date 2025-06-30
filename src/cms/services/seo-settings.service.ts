import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateSeoSettingsDto } from '../dto/seo-settings/create-seo-settings';
import { SeoSettings } from '../entities/seo-settings.schema';
import { GetAllById, PaginationDto } from '../dto/common.dto';
import { AgentProfile } from '../entities/profile.schema';

@Injectable()
export class SeoSettingsService {
  constructor(
    @InjectModel(SeoSettings.name) private seoSettingsModel: Model<SeoSettings>,
    @InjectModel(AgentProfile.name) private agentProfileModel: Model<AgentProfile>,

  ) { }

  async create(createSeoSettingsDto: CreateSeoSettingsDto, npn: string): Promise<SeoSettings> {
    try {
      const profile = await this.agentProfileModel.findOne({ npn });
      if (!profile) {
        throw new NotFoundException('Agent profile not found');
      }

      const seoSettings = new this.seoSettingsModel({ ...createSeoSettingsDto, agentProfile: profile._id });
      return seoSettings.save();
    }
    catch (error) {
      throw new NotFoundException("Failed to create seo settings");
    }
  }

  async findAll(pagination: PaginationDto, npn: string): Promise<SeoSettings[]> {
    try {
      if (npn === 'admin') {
        const page = pagination.page || 1;
        const limit = pagination.limit || 10;
        const skip = (page - 1) * limit;
        return this.seoSettingsModel.find().skip(skip).limit(limit).exec();
      }
      const profile = await this.agentProfileModel.findOne({ npn });
      if (!profile) {
        throw new NotFoundException('Agent profile not found');
      }
      const page = pagination.page || 1;
      const limit = pagination.limit || 10;
      const skip = (page - 1) * limit;
      return this.seoSettingsModel.find({
        agentProfile: profile._id,
      }).skip(skip).limit(limit).exec();
    }
    catch (error) {
      throw new NotFoundException("Failed to find all seo settings");
    }
  }

  async findByUserId(agentProfile: string, npn: string): Promise<SeoSettings[]> {
    if (npn === 'admin') {
      return this.seoSettingsModel.find({ agentProfile }).exec();
    }
    const profile = await this.agentProfileModel.findOne({ npn });
    if (!profile) {
      throw new NotFoundException('Agent profile not found');
    }
    return this.seoSettingsModel.find({ agentProfile: profile._id }).exec();
  }

  async findById(id: string, npn: string): Promise<SeoSettings> {
    try {
      if (npn === 'admin') {
        return this.seoSettingsModel.findById(id).exec();
      }
      const profile = await this.agentProfileModel.findOne({ npn });
      if (!profile) {
        throw new NotFoundException('Agent profile not found');
      }
      return this.seoSettingsModel.findOne({ _id: id, agentProfile: profile._id }).exec();
    }
    catch (error) {
      throw new NotFoundException("Failed to find seo settings by id");
    }
  }

  async deleteById(id: string, npn: string): Promise<SeoSettings> {
    try {
      if (npn === 'admin') {
        return this.seoSettingsModel.findByIdAndDelete(id).exec();
      }
      else {
        const profile = await this.agentProfileModel.findOne({ npn });
        if (!profile) {
          throw new NotFoundException('Agent profile not found');
        }
        return this.seoSettingsModel.findOneAndDelete({ _id: id, agentProfile: profile._id }).exec();
      }
    }
    catch (error) {
      throw new NotFoundException("Failed to delete seo settings by id");
    }
  }

  async updateById(id: string, updateSeoSettingsDto: Partial<CreateSeoSettingsDto>, npn: string): Promise<SeoSettings> {
    try {
      if (npn === 'admin') {
        return this.seoSettingsModel.findByIdAndUpdate(id, updateSeoSettingsDto, { new: true }).exec();
      }
      else {
        const profile = await this.agentProfileModel.findOne({ npn });
        if (!profile) {
          throw new NotFoundException('Agent profile not found');
        }
        return this.seoSettingsModel.findOneAndUpdate({ _id: id, agentProfile: profile._id }, updateSeoSettingsDto, { new: true }).exec();
      }
    }
    catch (error) {
      throw new NotFoundException("Failed to update seo settings by id");
    }
  }
}
