import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CallToAction } from '../entities/call-to-action.schema';
import { CreateCallToActionDto } from '../dto/portfolio/call-to-action/create-call-to-action';
import { GetAllById, PaginationDto } from '../dto/common.dto';
import { AgentProfile } from '../entities/profile.schema';

@Injectable()
export class CallToActionService {
   constructor(
      @InjectModel(CallToAction.name)
      private callToActionModel: Model<CallToAction>,
      @InjectModel(AgentProfile.name)
      private agentProfileModel: Model<AgentProfile>,
   ) { }

   async create(
      createCallToActionDto: CreateCallToActionDto,
      npn: string
   ): Promise<CallToAction> {
      const profile = await this.agentProfileModel.findOne({ npn });
      const callToAction = new this.callToActionModel({ ...createCallToActionDto, agentProfile: profile._id });
      return callToAction.save();
   }

   async findAll(paginationDto: PaginationDto, npn: string): Promise<CallToAction[]> {
      if (npn === 'admin') {
         return this.callToActionModel.find().limit(paginationDto.limit).skip(paginationDto.page).exec();
      }
      const profile = await this.agentProfileModel.findOne({
         npn
      });
      if (!profile) {
         throw new NotFoundException('Agent profile not found');
      }
      const skip = (paginationDto.page - 1) * paginationDto.limit || 0;
      const limit = paginationDto.limit ? paginationDto.limit : 10;
      return this.callToActionModel.find({
         agentProfile: profile._id,
      }).limit(limit).skip(skip).exec();
   }

   async findByUserId(npn: string, paginationDto: PaginationDto): Promise<CallToAction[]> {
      const profile = await this.agentProfileModel.findOne({ npn })
      if (!profile) {
         throw new NotFoundException('Agent profile not found');
      }
      return this.callToActionModel.find({ agentProfile: profile._id }).limit(paginationDto.limit).skip(paginationDto.page).exec();
   }

   async findById(id: string): Promise<CallToAction> {
      return this.callToActionModel.findById(id).exec();
   }

   async deleteById(id: string, npn: string): Promise<CallToAction> {
      if (npn === 'admin') {
         return this.callToActionModel.findByIdAndDelete(id).exec();
      }
      else {
         const profile = await this.agentProfileModel.findOne({ npn });
         if (!profile) {
            throw new NotFoundException('Agent profile not found');
         }
         return this.callToActionModel.findOneAndDelete({ _id: id, agentProfile: profile._id }).exec();
      }
   }

   async updateById(id: string, updateCallToActionDto: Partial<CreateCallToActionDto>, npn: string): Promise<CallToAction> {
      /**
       * Update a call to action by id
       * @param id - id of call to action to update
       * @param updateCallToActionDto - partial create call to action dto with updated fields
       * @returns updated call to action
       */
      if (npn === 'admin') {
         return await this.callToActionModel.findOneAndUpdate(
            { _id: id },
            { $set: updateCallToActionDto },
            { new: true }
         ).exec();
      } else {
         const profile = await this.agentProfileModel.findOne({
            npn
         })
         if (!profile) {
            throw new NotFoundException('Agent profile not found');
         }
         return await this.callToActionModel.findOneAndUpdate(
            { _id: id, agentProfile: profile._id },
            { $set: updateCallToActionDto },
            { new: true }
         ).exec();
      }
   }
}
