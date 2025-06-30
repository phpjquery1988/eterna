import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateContactFormDto } from '../dto/contact-form/create-contact-form';
import { ContactForm } from '../entities/contact-form.schema';
import { PaginationDto } from '../dto/common.dto';
import { AgentProfile } from '../entities/profile.schema';

@Injectable()
export class ContactFormService {
   constructor(
      @InjectModel(ContactForm.name) private contactFormModel: Model<ContactForm>,
      @InjectModel(AgentProfile.name) private agentProfileModel: Model<AgentProfile>,

   ) { }

   async create(createContactFormDto: CreateContactFormDto, npn: string): Promise<ContactForm> {
      const profile = await this.agentProfileModel.findOne({ npn });
      if (!profile) {
         throw new NotFoundException('Agent profile not found');
      }
      const form = new this.contactFormModel({ ...createContactFormDto, agentProfile: profile._id });
      return await form.save();
   }

   async findAll(paginationDto: PaginationDto, npn: string): Promise<ContactForm[]> {
      if (npn === 'admin') {
         const skip = (paginationDto.page - 1) * paginationDto.limit || 0;
         const limit = paginationDto.limit ? paginationDto.limit : 10;
         return this.contactFormModel.find().limit(limit).skip(skip).exec();
      }
      const profile = await this.agentProfileModel.findOne({
         npn,
      });
      if (!profile) {
         throw new NotFoundException('Agent profile not found');
      }
      const skip = (paginationDto.page - 1) * paginationDto.limit || 0;
      const limit = paginationDto.limit ? paginationDto.limit : 10;
      return this.contactFormModel.find({
         agentProfile: profile._id,
      }).limit(limit).skip(skip).exec();
   }

   async findByAgentProfile(npn: string): Promise<ContactForm[]> {
      const agentProfile = await this.agentProfileModel.findOne({
         npn,
      });
      return this.contactFormModel.find({ agentProfile: agentProfile._id }).exec();
   }

   async findById(id: string): Promise<ContactForm> {
      return this.contactFormModel.findById(id).exec();
   }

   async deleteById(id: string, npn: string): Promise<ContactForm> {
      if (npn === 'admin') {
         return this.contactFormModel.findOneAndDelete({
            _id: id,
         }).exec();
      }
      const profile = await this.agentProfileModel.findOne({
         npn,
      })
      if (!profile) {
         throw new NotFoundException('Agent profile not found');
      }
      return this.contactFormModel.findOneAndDelete({
         _id: id,
         agentProfile: profile._id,
      }).exec();
   }

   async updateById(id: string, updateContactFormDto: Partial<CreateContactFormDto>, npn: string): Promise<ContactForm> {
      if (npn === 'admin') {
         return this.contactFormModel.findByIdAndUpdate(id, updateContactFormDto, {
            new: true,
         })
      } else {
         const profile = await this.agentProfileModel.findOne({
            npn,
         })
         if (!profile) {
            throw new NotFoundException('Agent profile not found');
         }
         return this.contactFormModel.findOneAndUpdate({
            _id: id,
            agentProfile: profile._id,
         }, updateContactFormDto, {
            new: true,
         }).exec();
      }
   }
}
