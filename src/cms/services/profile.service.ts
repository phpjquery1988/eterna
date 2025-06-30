import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AgentProfile } from '../entities/profile.schema';
import { CreateAgentProfileDto } from '../dto/profile/create-profile.dto';
import { PaginationDto } from '../dto/common.dto';
import { Employee } from 'src/employee/entities/employee.schema';
import { generateAgentHash } from 'src/shared/base/hash';

@Injectable()
export class CmsService {

  constructor(
    @InjectModel(AgentProfile.name)
    private readonly agentProfileModel: Model<AgentProfile>,

    @InjectModel(Employee.name)
    private readonly employeeModel: Model<Employee>,
  ) { }
  async create(createAgentProfileDto: CreateAgentProfileDto): Promise<AgentProfile | ConflictException> {
    try {
      const hash = await generateAgentHash(createAgentProfileDto.email);
      const employee = await this.employeeModel.findOne({ npn: createAgentProfileDto.npn });
      if (!employee) {
        return new NotFoundException('Employee not found');
      }
      // check if profile already exist
      const agentProfileExists = await this.agentProfileModel.findOne({ employee: employee._id });
      if (agentProfileExists) {
        return new NotFoundException('Profile already exists');
      }
      const updatedAgentProfileDto = { ...createAgentProfileDto, employee: employee._id, hash };
      const agentProfile = new this.agentProfileModel(updatedAgentProfileDto);
      return agentProfile.save();
    }
    catch (error) {
      throw new ConflictException("Failed to create profile");
    }
  }

  async findOne(id: string, npn: string): Promise<AgentProfile> {
    try {

      if (npn === 'admin') {
        return this.agentProfileModel.findById(id).select('-_id -__v');
      }
      else {
        const profile = await this.agentProfileModel.findOne({
          npn
        })
        if (!profile) {
          throw new NotFoundException('Agent profile not found');
        }
        return profile
      }
    }
    catch (error) {
      throw new NotFoundException('Agent profile not found');
    }
  }

  async update(id: string, updateProfileDto: Partial<CreateAgentProfileDto>, npn: string): Promise<AgentProfile> {
    try {
      if (npn === 'admin') {
        return await this.agentProfileModel.findByIdAndUpdate(id, updateProfileDto, { new: true }).select('-_id -__v');
      }
      else {
        const profile = await this.agentProfileModel.findOne({
          npn
        })
        
        if (!profile) {
          throw new NotFoundException('Agent profile not found');
        }
        const t =  await this.agentProfileModel.findByIdAndUpdate(id, updateProfileDto, { new: true }).select('-_id -__v');
        await t.save()
      }
    }
    catch (error) {
      throw new NotFoundException('Agent profile not found');
    }
  }

  async findAll(pagination: PaginationDto, npn: string): Promise<AgentProfile[]> {
    try {
      if (npn === 'admin') {
        const skip = (pagination.page - 1) * pagination.limit || 0;
        const limit = pagination.limit ? pagination.limit : 10;
        return await this.agentProfileModel.find().select('-_id -__v').skip(skip).limit(limit);
      } else {

        const skip = (pagination.page - 1) * pagination.limit || 0;
        const limit = pagination.limit ? pagination.limit : 10;
        return await this.agentProfileModel.find().select('-_id -__v').skip(skip).limit(limit);
      }
    } catch (error) {
      throw new NotFoundException('Agent profile not found');
    }
  }
}
