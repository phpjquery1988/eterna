import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InsuranceProduct } from '../entities/insurance-product.schema';
import { CreateInsuranceProductDto } from '../dto/insurance-product/create.insurance-product.dto';
import { GetAllById, PaginationDto } from '../dto/common.dto';
import { AgentProfile } from '../entities/profile.schema';

@Injectable()
export class InsuranceProductService {
   constructor(
      @InjectModel(InsuranceProduct.name) private insuranceProductModel: Model<InsuranceProduct>,
      @InjectModel(AgentProfile.name) private agentProfileModel: Model<AgentProfile>,

   ) { }

   async create(createInsuranceProductDto: CreateInsuranceProductDto, npn: string): Promise<InsuranceProduct> {
      const profile = await this.agentProfileModel.findOne({ npn });
      if (!profile) {
         throw new NotFoundException('Agent profile not found');
      }
      const product = new this.insuranceProductModel({ ...createInsuranceProductDto, agentProfile: profile._id });
      return product.save();
   }

   async findAll(paginationDto: PaginationDto, npn: string): Promise<InsuranceProduct[]> {
      const profile = await this.agentProfileModel.findOne({
         npn
      });
      if (!profile) {
         throw new NotFoundException('Agent profile not found');
      }
      const skip = (paginationDto.page - 1) * paginationDto.limit || 0;
      const limit = paginationDto.limit ? paginationDto.limit : 10;
      return this.insuranceProductModel.find({
         agentProfile: profile._id
      }).limit(limit).skip(skip).exec();
   }

   async findByUserId(agentProfile: string): Promise<InsuranceProduct[]> {
      return this.insuranceProductModel.find({ agentProfile }).exec();
   }

   async findById(id: string): Promise<InsuranceProduct> {
      return this.insuranceProductModel.findById(id).exec();
   }

   async deleteById(id: string, npn: string): Promise<InsuranceProduct> {
      if (npn === 'admin') {
         return this.insuranceProductModel.findByIdAndDelete(id).exec();
      }
      else {
         const profile = await this.agentProfileModel.findOne({ npn });
         if (!profile) {
            throw new NotFoundException('Agent profile not found');
         }
         return this.insuranceProductModel.findOneAndDelete({ _id: id, agentProfile: profile._id }).exec();
      }
   }

   async updateById(id: string, updateInsuranceProductDto: Partial<CreateInsuranceProductDto>, npn: string): Promise<InsuranceProduct> {
      if (npn === 'admin') {
         return this.insuranceProductModel.findByIdAndUpdate(id, updateInsuranceProductDto, { new: true }).exec();
      }
      else {
         const profile = await this.agentProfileModel.findOne({ npn });
         if (!profile) {
            throw new NotFoundException('Agent profile not found');
         }
         return this.insuranceProductModel.findOneAndUpdate({ _id: id, agentProfile: profile._id }, updateInsuranceProductDto, { new: true }).exec();
      }
   }
}