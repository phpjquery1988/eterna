import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Testimonial } from '../entities/testimonials.schema';
import { AgentProfile } from '../entities/profile.schema';
import { CallToAction } from '../entities/call-to-action.schema';
import { Employee } from 'src/employee/entities/employee.schema';
import { License } from 'src/employee/entities/license.schema';
import { LicenseStatus } from '@app/contracts';
import { Service } from '../entities/services.schema';

@Injectable()
export class ViewService {
   constructor(
      @InjectModel(Testimonial.name) private testimonialModel: Model<Testimonial>,
      @InjectModel(AgentProfile.name) private agentProfileModel: Model<AgentProfile>,
      @InjectModel(CallToAction.name) private callToActionModel: Model<CallToAction>,
      @InjectModel(Employee.name) private employeeModel: Model<Employee>,
      @InjectModel(License.name) private licenseModel: Model<License>,
   ) { }

   async view(hash: string) {
      const profile = await this.agentProfileModel.findOne({
         hash: hash,
         isApproved: true
      }).select(' bio headline socialMediaLinks  websiteUrl phone  avatar fullName npn');

      if (!profile) {
         throw new NotFoundException('Profile not found');
      }
      const employee = await this.employeeModel.findOne({
         npn: profile.npn
      }).select('npn');
      console.log("🚀 ~ ViewService ~ view ~ employee:", employee)

      if (!employee) {
         throw new NotFoundException('Employee not found');
      }
      const licenses = await this.licenseModel.find({ user: employee._id, status: LicenseStatus.ACTIVE }).select('state carrier expirationDate');
      const testimonials = await this.testimonialModel.find({ agentProfile: profile._id }).select('clientName testimonialContent  clientPicture rating');
      const callToAction = await this.callToActionModel.find({ agentProfile: profile._id });
      return { profile, callToAction, licenses, testimonials };

   }

}
