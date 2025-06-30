import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Service } from '../entities/services.schema';
import { CreateServiceDto } from '../dto/service/create-service.dto';
import { GetAllById, PaginationDto } from '../dto/common.dto';
import { AgentProfile } from '../entities/profile.schema';

@Injectable()
export class ServicesService {
  constructor(
    @InjectModel(Service.name) private serviceModel: Model<Service>,
    @InjectModel(AgentProfile.name) private agentProfileModel: Model<AgentProfile>,
  ) { }

  async create(createServiceDto: CreateServiceDto, npn: string): Promise<Service> {
    const profileExisted = await this.agentProfileModel.findOne({ npn }).exec();
    if (!profileExisted) {
      throw new NotFoundException('Agent profile not found');
    }

    const service = new this.serviceModel({
      ...createServiceDto,
      agentProfile: profileExisted._id
    });
    return service.save();
  }

  async findAll(pagination: PaginationDto, npn: string): Promise<Service[]> {
    try {
      if (npn === 'admin') {
        const skip = (pagination.page - 1) * pagination.limit || 0;
        const limit = pagination.limit ? pagination.limit : 10;
        return this.serviceModel.find().limit(limit).skip(skip).exec();
      }
      const profile = await this.agentProfileModel.findOne({ npn });
      if (!profile) {
        throw new NotFoundException('Agent profile not found');
      }
      const skip = (pagination.page - 1) * pagination.limit || 0;
      const limit = pagination.limit ? pagination.limit : 10;
      return this.serviceModel.find({
        agentProfile: profile._id
      }).limit(limit).skip(skip).exec();
    }
    catch (error) {
      throw new NotFoundException("Failed to find all services");
    }
  }

  async findById(id: string, npn: string): Promise<Service> {
    try {
      if (npn === 'admin') {
        return this.serviceModel.findById(id).exec();
      }
      const profile = await this.agentProfileModel.findOne({ npn });
      if (!profile) {
        throw new NotFoundException('Agent profile not found');
      }
      return this.serviceModel.findOne({ _id: id, agentProfile: profile._id }).exec();
    }
    catch (error) {
      throw new NotFoundException("Failed to find service by id");
    }
  }

  async deleteById(id: string, npn: string): Promise<Service> {
    try {
      if (npn === 'admin') {
        return this.serviceModel.findByIdAndDelete(id).exec();
      }
      else {
        const profile = await this.agentProfileModel.findOne({ npn });
        if (!profile) {
          throw new NotFoundException('Agent profile not found');
        }
        return this.serviceModel.findOneAndDelete({ _id: id, agentProfile: profile._id }).exec();
      }
    }
    catch (error) {
      throw new NotFoundException("Failed to delete service by id");
    }

  }
}
