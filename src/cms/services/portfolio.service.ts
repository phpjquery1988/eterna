import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Portfolio } from '../entities/portfolio.schema';
import { CreatePortfolioDto } from '../dto/portfolio/create.portfolio.dto';
import { GetAllById, PaginationDto } from '../dto/common.dto';
import { AgentProfile } from '../entities/profile.schema';

@Injectable()
export class PortfolioService {
   constructor(
      @InjectModel(Portfolio.name) private portfolioModel: Model<Portfolio>,
      @InjectModel(AgentProfile.name) private agentProfileModel: Model<AgentProfile>,

   ) { }

   async create(createPortfolioDto: CreatePortfolioDto, npn: string): Promise<Portfolio> {
      const profile = await this.agentProfileModel.findOne({ npn });
      if (!profile) {
         throw new NotFoundException('Agent profile not found');
      }
      const portfolio = new this.portfolioModel({ ...createPortfolioDto, agentProfile: profile._id });
      return portfolio.save();
   }

   async findAll(paginationDto: PaginationDto, npn: string): Promise<Portfolio[]> {
      if (npn === 'admin') {
         const skip = (paginationDto.page - 1) * paginationDto.limit || 0;
         const limit = paginationDto.limit ? paginationDto.limit : 10;
         return this.portfolioModel.find().limit(limit).skip(skip).exec();

      }
      const profile = await this.agentProfileModel.findById({
         npn
      });
      if (!profile) {
         throw new NotFoundException('Agent profile not found');
      }
      const skip = (paginationDto.page - 1) * paginationDto.limit || 0;
      const limit = paginationDto.limit ? paginationDto.limit : 10;
      return this.portfolioModel.find({
         agentProfile: profile._id
      }).limit(limit).skip(skip).exec();
   }

   async findByUserId(npn: string): Promise<Portfolio[]> {
      const agentProfile = await this.agentProfileModel.findOne({ npn });
      if (!agentProfile) {
         throw new NotFoundException('Agent profile not found');
      }
      return this.portfolioModel.find({ agentProfile: agentProfile._id }).exec();
   }

   async findById(id: string): Promise<Portfolio> {
      return this.portfolioModel.findById(id).exec();
   }

   async deleteById(id: string, npn: string): Promise<Portfolio> {
      if (npn === 'admin') {
         return this.portfolioModel.findByIdAndDelete(id).exec();
      } else {
         const profile = await this.agentProfileModel.findOne({ npn });
         if (!profile) {
            throw new NotFoundException('Agent profile not found');
         }
         return this.portfolioModel.findOneAndDelete({ _id: id, agentProfile: profile._id }).exec();
      }
   }

   async updateById(id: string, updatePortfolioDto: Partial<CreatePortfolioDto>, npn: string): Promise<Portfolio> {
      if (npn === 'admin') {
         return this.portfolioModel.findByIdAndUpdate(id, updatePortfolioDto, {
            new: true,
         }).exec();
      }
      else {
         const profile = await this.agentProfileModel.findOne({ npn });
         if (!profile) {
            throw new NotFoundException('Agent profile not found');
         }
         return this.portfolioModel.findOneAndUpdate({ _id: id, agentProfile: profile._id }, updatePortfolioDto, { new: true }).exec();
      }
   }
}
