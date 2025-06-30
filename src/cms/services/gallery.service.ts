import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Gallery } from '../entities/gallery.schema';
import { CreateGalleryDto } from '../dto/gallery/create-gallery.dto';
import { GetAllById, PaginationDto } from '../dto/common.dto';
import { AgentProfile } from '../entities/profile.schema';

@Injectable()
export class GalleryService {
   constructor(
      @InjectModel(Gallery.name) private galleryModel: Model<Gallery>,
      @InjectModel(AgentProfile.name) private agentProfileModel: Model<AgentProfile>,

   ) { }

   async create(createGalleryDto: CreateGalleryDto, npn: string): Promise<Gallery> {
      const profile = await this.agentProfileModel.findOne({
         npn
      });
      if (!profile) {
         throw new NotFoundException('Agent profile not found');
      }
      const gallery = new this.galleryModel({ ...createGalleryDto, agentProfile: profile._id });
      return gallery.save();
   }

   async findAll(paginationDto: PaginationDto, npn: string): Promise<Gallery[]> {
      if (npn === 'admin') {
         const skip = (paginationDto.page - 1) * paginationDto.limit || 0;
         const limit = paginationDto.limit ? paginationDto.limit : 10;
         return this.galleryModel.find().limit(limit).skip(skip).exec();
      }
      const profile = await this.agentProfileModel.findOne({
         npn,
      })
      if (!profile) {
         throw new NotFoundException('Agent profile not found');
      }
      const skip = (paginationDto.page - 1) * paginationDto.limit || 0;
      const limit = paginationDto.limit ? paginationDto.limit : 10;
      return this.galleryModel.find({
         agentProfile: profile._id
      }).limit(limit).skip(skip).exec();
   }

   async findByUserId(npn: string): Promise<Gallery[]> {
      const profile = await this.agentProfileModel.findOne({ npn })
      if (!profile) {
         throw new NotFoundException('Agent profile not found');
      }
      return this.galleryModel.find({ agentProfile: profile._id }).exec();
   }

   async findById(id: string): Promise<Gallery> {
      return this.galleryModel.findById(id).exec();
   }

   async deleteById(id: string, npn: string): Promise<Gallery> {
      if (npn === 'admin') {
         return this.galleryModel.findByIdAndDelete(id).exec();
      } else {
         const profile = await this.agentProfileModel.findOne({ npn });
         if (!profile) {
            throw new NotFoundException('Agent profile not found');
         }
         return this.galleryModel.findOneAndDelete({ _id: id, agentProfile: profile._id }).exec();
      }
   }

   // update a gallery by id
   async updateById(id: string, updateGalleryDto: Partial<CreateGalleryDto>, npn: string): Promise<Gallery> {
      if (npn === 'admin') {
         return this.galleryModel.findByIdAndUpdate(id, updateGalleryDto, {
            new: true,
         }).exec();
      } else {
         const profile = await this.agentProfileModel.findOne({
            npn
         })
         if (!profile) {
            throw new NotFoundException('Agent profile not found');
         }
         return this.galleryModel.findOneAndUpdate({
            _id: id,
            agentProfile: profile._id,
         }, updateGalleryDto, {
            new: true,
         }).exec();
      }
   }
}
