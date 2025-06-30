import {
  BadRequestException,
  UnauthorizedException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EmployeeService } from './employee.service';
import { EmployeeProfile } from '../entities/employee.profile.schema';
import { EmployeeProfileStatus, UserRoleEnum } from '@app/contracts';
import { StateService } from './state.service';
import { CarrierService } from './carrier.service';
import { TwilioService } from 'src/auth/services/twilio-auth.service';
import { S3Service } from './s3.service';
import { EmployeeProfileAudit } from '../entities/employee.profile-audit.schema';
import { last } from 'rxjs';
import { Employee } from '../entities/employee.schema';

@Injectable()
export class EmployeeProfileService {
  constructor(
    private readonly employeeService: EmployeeService,
    private readonly stateService: StateService,
    private readonly carrierService: CarrierService,
    private readonly s3Service: S3Service,
    @InjectModel(EmployeeProfile.name)
    private readonly employeeProfileModel: Model<EmployeeProfile>,
    @InjectModel(EmployeeProfileAudit.name)
    private readonly employeeProfileAuditModel: Model<EmployeeProfileAudit>,
    @InjectModel(Employee.name)
    private readonly employeeModel: Model<Employee>,
  ) {}

  async storeAuditHistory(npn: string, receiverNpn: string, data: any) {
    const receiverDetails = await this.employeeService.findByNpn(receiverNpn);
    if (!receiverDetails) {
      throw new BadRequestException('Agent not found!');
    }

    const auditEntry = {
      npn: receiverNpn,
      name: receiverDetails.agent,
      timestamp: new Date(),
      data: data,
    };

    await this.employeeProfileAuditModel.findOneAndUpdate(
      { npn },
      {
        $push: { auditHistory: auditEntry },
        $setOnInsert: { npn },
      },
      {
        new: true, // Return the modified document rather than the original.
        upsert: true, // Create the document if it doesn’t exist.
      },
    );
  }

  async validateReceiver(npn: string, receiverNpn: string) {
    if (npn === receiverNpn) return;

    const uplines = await this.employeeService.getUplineChain(npn);

    const isUpline = uplines.some((upline) => upline.npn === receiverNpn);
    if (isUpline) return;

    throw new UnauthorizedException(
      'You are not authorized to view this profile!',
    );
  }

  async submitProfile(npn: string, receiverNpn: string) {
    if (npn !== receiverNpn) {
      throw new UnauthorizedException(
        'You are not authorized to submit this profile!',
      );
    }

    const updateProfile = {
      status: EmployeeProfileStatus.SUBMITTED,
    };

    try {
      const profile = await this.employeeProfileModel.findOneAndUpdate(
        { npn, status: EmployeeProfileStatus.DRAFTED },
        { $set: updateProfile },
        { new: true, upsert: false },
      );

      if (!profile) {
        throw new BadRequestException(
          'Profile not created or already submitted!',
        );
      }

      this.storeAuditHistory(npn, receiverNpn, updateProfile);
      return { _id: profile._id, status: profile.status, npn: profile.npn };
    } catch (error) {
      console.error('Error submitting profile:', error.message);
      throw new BadRequestException(error.message);
    }
  }

  async getProfile(npn: string, receiverNpn: string): Promise<any> {
    console.log(receiverNpn, 'receiverNpn');
    await this.validateReceiver(npn, receiverNpn);

    try {
      let profile = await this.employeeProfileModel.findOne({ npn });

      if (!profile) {
        const [employeeDetails, userDetails] = await Promise.all([
          this.employeeService.findByNpn(npn),
          this.employeeService.findUserByNpn(npn),
        ]);

        if (!employeeDetails) {
          throw new BadRequestException('Agent not found!');
        }

        const createProfile = {
          npn: npn,
          avatar: employeeDetails.avatar,
          name: employeeDetails.agent,
          firstName: employeeDetails.agent.split(' ')[0],
          lastName: employeeDetails.agent.split(' ')[1],
          email: employeeDetails.email,
          phone: employeeDetails.phone,
          upline: employeeDetails.agentsUpline,
          uplineNpn: employeeDetails.agentsUplineNpn,
          status: EmployeeProfileStatus.INITIALIZED,
          isNewAvatar: false,
          role: userDetails.role,
        };
        profile = await this.employeeProfileModel.create(createProfile);
        this.storeAuditHistory(npn, receiverNpn, createProfile);
      }

      const role = profile.role || UserRoleEnum.Employee;
      const finalProfile: any = { ...profile.toJSON(), role };

      // manage selected carriers logic
      const carriers = await this.carrierService.allCarriers();
      const selectedCarriers = finalProfile.carriers.map((c) => c.slug);
      finalProfile.carriers = carriers.map((carrier) => {
        const carrierData: any = { ...carrier.toJSON() };
        carrierData.selected = selectedCarriers.includes(carrier.slug);
        return carrierData;
      });

      // manage selected licenses statewise logic
      finalProfile.licenses = this.stateService.getStates().map((state) => {
        const license = finalProfile.licenses.find(
          (l) => l.postal === state.postal,
        );

        return {
          ...state,
          ...license,
          selected: !!license,
        };
      });

      finalProfile.whyWorkWithServices = finalProfile.whyWorkWithServices.map(
        (service) => {
          return {
            ...service,

            description: service.description.replaceAll(
              '{{name}}',
              finalProfile.name,
            ),
          };
        },
      );

      return finalProfile;
    } catch (error) {
      console.error('Error fetching profile:', error.message);
      throw new BadRequestException('Something went wrong!');
    }
  }

  async updateProfile(
    npn: string,
    receiverNpn: string,
    formData: any,
    avatarFile: Express.Multer.File,
    familyPhotoFile: Express.Multer.File,
  ): Promise<any> {
    await this.validateReceiver(npn, receiverNpn);

    let profile = await this.employeeProfileModel.findOne({ npn });
    if (!profile) {
      throw new BadRequestException('Profile not found!');
    }

    if (profile.status === EmployeeProfileStatus.DISABLED) {
      throw new BadRequestException(
        'Your profile is disabled, please contact system admin!',
      );
    }

    try {
      const updateForm: any = {};

      if (formData.email || formData.email === '') {
        updateForm.email = formData.email.toLowerCase();
      }
      if (formData.rating || formData.rating === '') {
        updateForm.rating = formData.rating ? Number(formData.rating) : 0;
      }
      if (formData.address || formData.address === '') {
        updateForm.address = formData.address;
      }
      if (formData.quote || formData.quote === '') {
        updateForm.quote = formData.quote;
      }
      if (formData.quoteLink || formData.quoteLink === '') {
        updateForm.quoteLink = formData.quoteLink;
      }
      if (formData.appointmentLink || formData.appointmentLink === '') {
        updateForm.appointmentLink = formData.appointmentLink;
      }
      if (formData.phone || formData.phone === '') {
        updateForm.phone = formData.phone
          ? TwilioService.getFormattedPhoneNumber(formData.phone)
          : '';
      }
      if (formData.familyDescription || formData.familyDescription === '') {
        updateForm.familyDescription = formData.familyDescription;
      }

      if (formData.firstName || formData.firstName !== '') {
        updateForm.firstName = formData.firstName;
      }
      if (formData.lastName || formData.lastName !== '') {
        updateForm.lastName = formData.lastName;
      }
      
      const {
        firstName: rawFirst = profile.firstName,
        lastName: rawLast = profile.lastName,
      } = formData;

      // only rebuild the full name if the caller is updating one of its parts
      if ('firstName' in updateForm || 'lastName' in updateForm) {
        const first = rawFirst.trim();
        const last = rawLast.trim();
        updateForm.name = `${first} ${last}`;
      }

      if (formData.designation || formData.designation !== '') {
        updateForm.designation = formData.designation;
      }

      if (
        formData.contactDetailDescription ||
        formData.contactDetailDescription === ''
      ) {
        updateForm.contactDetailDescription = formData.contactDetailDescription;
      }

      if (formData.facebookLink || formData.facebookLink === '') {
        updateForm.facebookLink = formData.facebookLink;
      }

      if (formData.instaLink || formData.instaLink === '') {
        updateForm.instaLink = formData.instaLink;
      }

      if (formData.linkedInLink || formData.linkedInLink === '') {
        updateForm.linkedInLink = formData.linkedInLink;
      }

      if (
        formData.whyWorkWithDescription ||
        formData.whyWorkWithDescription === ''
      ) {
        updateForm.whyWorkWithDescription = formData.whyWorkWithDescription;
      }

      if (Array.isArray(formData.insuranceTypes)) {
        updateForm.insuranceTypes = formData.insuranceTypes;
      } else if (typeof formData.insuranceTypes === 'string') {
        updateForm.insuranceTypes = formData.insuranceTypes.split(',');
      }

      if (Array.isArray(formData.serviceProvided)) {
        updateForm.serviceProvided = formData.serviceProvided.map((item) =>
          JSON.parse(item),
        );
      } else if (typeof formData.serviceProvided === 'string') {
        updateForm.serviceProvided = [JSON.parse(formData.serviceProvided)];
      }

      if (Array.isArray(formData.whyWorkWithServices)) {
        updateForm.whyWorkWithServices = formData.whyWorkWithServices.map(
          (item) => JSON.parse(item),
        );
      } else if (typeof formData.whyWorkWithServices === 'string') {
        updateForm.whyWorkWithServices = [
          JSON.parse(formData.whyWorkWithServices),
        ];
      }

      if (avatarFile) {
        const fileName = `profiles/${Date.now()}-${avatarFile.originalname}`;
        const [avatarUrl] = await Promise.all([
          this.s3Service.uploadFile(
            avatarFile.buffer,
            fileName,
            avatarFile.mimetype,
          ),
          profile.isNewAvatar && profile.avatar
            ? this.s3Service.deleteFileFromUrl(profile.avatar)
            : null,
        ]);

        updateForm.isNewAvatar = true;
        updateForm.avatar = avatarUrl;
      }

      if (familyPhotoFile) {
        const fileName = `profiles/${Date.now()}-${familyPhotoFile.originalname}`;
        const [familyPhotoUrl] = await Promise.all([
          this.s3Service.uploadFile(
            familyPhotoFile.buffer,
            fileName,
            familyPhotoFile.mimetype,
          ),
          profile.familyPhoto
            ? this.s3Service.deleteFileFromUrl(profile.familyPhoto)
            : null,
        ]);
        updateForm.familyPhoto = familyPhotoUrl;
      } else if (formData.familyPhoto === '') {
        updateForm.familyPhoto = formData.familyPhoto;
      }

      if (Object.keys(updateForm).length > 0) {
        updateForm.status = EmployeeProfileStatus.DRAFTED;
      if (formData.status || formData.status !== '') {
        updateForm.status = EmployeeProfileStatus.SUBMITTED;
      }
        await this.employeeProfileModel.findOneAndUpdate(
          { npn },
          { $set: updateForm },
          { new: true, upsert: false },
        );

        this.storeAuditHistory(npn, receiverNpn, updateForm);
      }

      return this.getProfile(npn, receiverNpn);
    } catch (error) {
      console.error('Error fetching profile:', error.message);
      throw new BadRequestException('Something went wrong!');
    }
  }

  async addLicense(
    npn: string,
    receiverNpn: string,
    postal: string,
    file: Express.Multer.File,
  ) {
    postal = postal.toUpperCase();

    await this.validateReceiver(npn, receiverNpn);

    const selectedState = this.stateService
      .getStates()
      .find((s) => s.postal === postal);
    if (!selectedState) {
      throw new BadRequestException('Invalid state!');
    }

    let profile = await this.employeeProfileModel.findOne({ npn });
    if (!profile) {
      throw new BadRequestException('Profile not found!');
    }

    if (
      profile.status === EmployeeProfileStatus.SUBMITTED &&
      npn === receiverNpn
    ) {
      throw new BadRequestException('Profile already submitted!');
    }

    try {
      const license = profile.licenses.find(
        (license) => license.postal === postal,
      );

      const newLicense = {
        ...selectedState,
        ...license,
      };

      const fileName = `licenses/${Date.now()}-${file.originalname}`;

      const [imageUrl] = await Promise.all([
        this.s3Service.uploadFile(file.buffer, fileName, file.mimetype),
        license && license.imageUrl
          ? this.s3Service.deleteFileFromUrl(license.imageUrl)
          : null,
      ]);

      newLicense.imageUrl = imageUrl;

      const licenseIdx = profile.licenses.findIndex(
        (license) => license.postal === newLicense.postal,
      );

      if (licenseIdx > -1) {
        profile.licenses[licenseIdx] = newLicense;
      } else {
        profile.licenses.push(newLicense);
      }

      const updatedProfile = await this.employeeProfileModel.findOneAndUpdate(
        { npn },
        { $set: { licenses: profile.licenses } },
        { new: true, upsert: false },
      );

      this.storeAuditHistory(npn, receiverNpn, {
        operation: 'ADD_LICENSE',
        license: newLicense,
      });
      return {
        license: updatedProfile.licenses,
      };
    } catch (error) {
      console.error('Error adding license:', error.message);
      throw new BadRequestException('Something went wrong!');
    }
  }

  async removeLicense(npn: string, receiverNpn: string, postal: string) {
    postal = postal.toUpperCase();

    await this.validateReceiver(npn, receiverNpn);

    const selectedState = this.stateService
      .getStates()
      .find((s) => s.postal === postal);
    if (!selectedState) {
      throw new BadRequestException('Invalid state!');
    }

    let profile = await this.employeeProfileModel.findOne({ npn });
    if (!profile) {
      throw new BadRequestException('Profile not found!');
    }

    if (
      profile.status === EmployeeProfileStatus.SUBMITTED &&
      npn === receiverNpn
    ) {
      throw new BadRequestException('Profile already submitted!');
    }

    try {
      const license = profile.licenses.find(
        (license) => license.postal === postal,
      );

      profile.licenses = profile.licenses.filter(
        (license) => license.postal !== postal,
      );

      if (license.imageUrl) {
        await this.s3Service.deleteFileFromUrl(license.imageUrl);
      }

      const updatedProfile = await this.employeeProfileModel.findOneAndUpdate(
        { npn },
        { $set: { licenses: profile.licenses } },
        { new: true, upsert: false },
      );

      this.storeAuditHistory(npn, receiverNpn, {
        operation: 'REMOVE_LICENSE',
        license: license,
      });
      return {
        license: updatedProfile.licenses,
      };
    } catch (error) {
      console.error('Error removing license:', error.message);
      throw new BadRequestException('Something went wrong!');
    }
  }

  async addCarriers(npn: string, receiverNpn: string, formData: any) {
    const selectedCarriers: string[] = formData.carriers || [];

    await this.validateReceiver(npn, receiverNpn);

    const [profile, carriers] = await Promise.all([
      this.employeeProfileModel.findOne({ npn }),
      this.carrierService.allCarriers(),
    ]);

    if (!profile) {
      throw new BadRequestException('Profile not found!');
    }

    if (
      profile.status === EmployeeProfileStatus.SUBMITTED &&
      npn === receiverNpn
    ) {
      throw new BadRequestException('Profile already submitted!');
    }

    const isInvalidCarriers = selectedCarriers.some(
      (carrier) => !carriers.find((c) => c.slug === carrier),
    );
    if (isInvalidCarriers) {
      throw new BadRequestException('Invalid carriers selected!');
    }

    const matchedCarriers = carriers.filter((c) =>
      selectedCarriers.includes(c.slug),
    );

    try {
      const updatedProfile = await this.employeeProfileModel.findOneAndUpdate(
        { npn },
        { $set: { carriers: matchedCarriers } },
        { new: true, upsert: false },
      );

      this.storeAuditHistory(npn, receiverNpn, {
        operation: 'UPDATE_CARRIERS',
        carriers: matchedCarriers,
      });
      return {
        carriers: updatedProfile.carriers,
      };
    } catch (error) {
      console.error('Error updating carriers:', error.message);
      throw new BadRequestException('Something went wrong!');
    }
  }

  async getProfileForUpline(receiverNpn: string, query: any): Promise<any> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = query.search?.trim() || '';
    const status = query.status?.trim() || '';
    const sortOrder: 1 | -1 = Number(query.sortOrder) === 1 ? 1 : -1;

    try {
      const npns = await this.employeeService.getAllDownlines(receiverNpn);

      const match: any = {
        npn: { $in: npns },
      };

      if (status) {
        match.status = status;
      }

      if (search) {
        match.$or = [
          { name: { $regex: search, $options: 'i' } },
          { upline: { $regex: search, $options: 'i' } },
        ];
      }

      const result = await this.employeeProfileModel.aggregate([
        { $match: match },
        { $sort: { name: sortOrder } },
        {
          $facet: {
            data: [{ $skip: skip }, { $limit: limit }],
            total: [{ $count: 'count' }],
          },
        },
      ]);

      const data = result[0]?.data || [];
      const total = result[0]?.total[0]?.count || 0;

      return {
        profiles: data.map((profile) => {
          delete profile.carriers;
          delete profile.licenses;
          delete profile.testimonials;
          delete profile.__v;
          return profile;
        }),
        total,
        page,
        limit,
      };
    } catch (error) {
      console.error('Error fetching profile:', error.message);
      throw new BadRequestException('Something went wrong!');
    }
  }

  async getPublicProfile(npn: string): Promise<any> {
    let profile = await this.employeeProfileModel.findOne({ npn });

    if (!profile || profile.status !== EmployeeProfileStatus.PUBLISHED) {
      throw new NotFoundException('Profile not found!');
    }

    try {
      const finalProfile: any = { ...profile.toJSON() };

      // manage selected carriers logic
      const carriers = await this.carrierService.allCarriers();
      const selectedCarriers = finalProfile.carriers.map((c) => c.slug);
      finalProfile.carriers = carriers.map((carrier) => {
        const carrierData: any = { ...carrier.toJSON() };
        carrierData.selected = selectedCarriers.includes(carrier.slug);
        return carrierData;
      });

      // manage selected licenses statewise logic
      finalProfile.licenses = this.stateService.getStates().map((state) => {
        const license = finalProfile.licenses.find(
          (l) => l.postal === state.postal,
        );

        return {
          ...state,
          ...license,
          selected: !!license,
        };
      });

      finalProfile.whyWorkWithServices = finalProfile.whyWorkWithServices.map(
        (service) => {
          return {
            ...service,

            description: service.description.replaceAll(
              '{{name}}',
              finalProfile.name,
            ),
          };
        },
      );

      return finalProfile;
    } catch (error) {
      console.error('Error fetching profile:', error.message);
      throw new BadRequestException('Something went wrong!');
    }
  }

  async publishProfiles(
    receiverNpn: string,
    role: UserRoleEnum,
    body: any,
  ): Promise<any> {
    try {
      if (role !== UserRoleEnum.Admin) {
        throw new BadRequestException('Only admin can publish the profiles!');
      }

      if (!Array.isArray(body.npns) || body.npns.length === 0) {
        throw new BadRequestException('Invalid NPNs provided!');
      }
      const npns: string[] = body.npns;

      const [downlineNpns, existingProfiles] = await Promise.all([
        this.employeeService.getAllDownlines(receiverNpn),
        this.employeeProfileModel.find({
          npn: { $in: npns },
        }),
      ]);

      if (npns.every((npn) => !downlineNpns.includes(npn))) {
        throw new BadRequestException(
          'You are not authorized to publish these profiles!',
        );
      }

      const unpublishedNpns = existingProfiles
        .filter((profile) =>
          [
            EmployeeProfileStatus.SUBMITTED,
            EmployeeProfileStatus.UNPUBLISHED,
          ].includes(profile.status as EmployeeProfileStatus),
        )
        .map((profile) => profile.npn);

      const profiles = await this.employeeProfileModel.updateMany(
        { npn: { $in: unpublishedNpns } },
        { $set: { status: EmployeeProfileStatus.PUBLISHED } },
      );

      Promise.all(
        unpublishedNpns.map(async (npn: string) => {
          const profileUpdate = { status: EmployeeProfileStatus.PUBLISHED };
          return this.storeAuditHistory(npn, receiverNpn, profileUpdate);
        }),
      );

      return {
        message: 'Profiles published successfully!',
        count: profiles.modifiedCount,
      };
    } catch (error) {
      console.error('Error publishing profile:', error.message);
      throw new BadRequestException(error.message);
    }
  }

  async unpublishProfiles(
    receiverNpn: string,
    role: UserRoleEnum,
    body: any,
  ): Promise<any> {
    try {
      if (role !== UserRoleEnum.Admin) {
        throw new BadRequestException('Only admin can unpublish the profiles!');
      }

      if (!Array.isArray(body.npns) || body.npns.length === 0) {
        throw new BadRequestException('Invalid NPNs provided!');
      }
      const npns: string[] = body.npns;

      const [downlineNpns, existingProfiles] = await Promise.all([
        this.employeeService.getAllDownlines(receiverNpn),
        this.employeeProfileModel.find({
          npn: { $in: npns },
        }),
      ]);

      if (npns.every((npn) => !downlineNpns.includes(npn))) {
        throw new BadRequestException(
          'You are not authorized to unpublish these profiles!',
        );
      }

      const publishedNpns = existingProfiles
        .filter((profile) =>
          [EmployeeProfileStatus.PUBLISHED].includes(
            profile.status as EmployeeProfileStatus,
          ),
        )
        .map((profile) => profile.npn);

      const profiles = await this.employeeProfileModel.updateMany(
        { npn: { $in: publishedNpns } },
        { $set: { status: EmployeeProfileStatus.UNPUBLISHED } },
      );

      Promise.all(
        publishedNpns.map(async (npn: string) => {
          const profileUpdate = { status: EmployeeProfileStatus.UNPUBLISHED };
          return this.storeAuditHistory(npn, receiverNpn, profileUpdate);
        }),
      );

      return {
        message: 'Profiles unpublished successfully!',
        count: profiles.modifiedCount,
      };
    } catch (error) {
      console.error('Error unpublishing profile:', error.message);
      throw new BadRequestException(error.message);
    }
  }

  async disableProfiles(
    receiverNpn: string,
    role: UserRoleEnum,
    body: any,
  ): Promise<any> {
    try {
      if (role !== UserRoleEnum.Admin) {
        throw new BadRequestException('Only admin can disable the profiles!');
      }

      if (!Array.isArray(body.npns) || body.npns.length === 0) {
        throw new BadRequestException('Invalid NPNs provided!');
      }
      const npns: string[] = body.npns;

      const [downlineNpns, existingProfiles] = await Promise.all([
        this.employeeService.getAllDownlines(receiverNpn),
        this.employeeProfileModel.find({
          npn: { $in: npns },
        }),
      ]);

      if (npns.every((npn) => !downlineNpns.includes(npn))) {
        throw new BadRequestException(
          'You are not authorized to disable these profiles!',
        );
      }

      const notDisabledNpns = existingProfiles
        .filter(
          (profile) =>
            ![EmployeeProfileStatus.DISABLED].includes(
              profile.status as EmployeeProfileStatus,
            ),
        )
        .map((profile) => profile.npn);

      const profiles = await this.employeeProfileModel.updateMany(
        { npn: { $in: notDisabledNpns } },
        { $set: { status: EmployeeProfileStatus.DISABLED } },
      );

      Promise.all(
        notDisabledNpns.map(async (npn: string) => {
          const profileUpdate = { status: EmployeeProfileStatus.DISABLED };
          return this.storeAuditHistory(npn, receiverNpn, profileUpdate);
        }),
      );

      return {
        message: 'Profiles disabled successfully!',
        count: profiles.modifiedCount,
      };
    } catch (error) {
      console.error('Error disabling profile:', error.message);
      throw new BadRequestException(error.message);
    }
  }

  async enableProfiles(
    receiverNpn: string,
    role: UserRoleEnum,
    body: any,
  ): Promise<any> {
    try {
      if (role !== UserRoleEnum.Admin) {
        throw new BadRequestException('Only admin can enable the profiles!');
      }

      if (!Array.isArray(body.npns) || body.npns.length === 0) {
        throw new BadRequestException('Invalid NPNs provided!');
      }
      const npns: string[] = body.npns;

      const [downlineNpns, existingProfiles] = await Promise.all([
        this.employeeService.getAllDownlines(receiverNpn),
        this.employeeProfileModel.find({
          npn: { $in: npns },
        }),
      ]);

      if (npns.every((npn) => !downlineNpns.includes(npn))) {
        throw new BadRequestException(
          'You are not authorized to disable these profiles!',
        );
      }

      const disabledNpns = existingProfiles
        .filter((profile) =>
          [EmployeeProfileStatus.DISABLED].includes(
            profile.status as EmployeeProfileStatus,
          ),
        )
        .map((profile) => profile.npn);

      const profiles = await this.employeeProfileModel.updateMany(
        { npn: { $in: disabledNpns } },
        { $set: { status: EmployeeProfileStatus.DRAFTED } },
      );

      Promise.all(
        disabledNpns.map(async (npn: string) => {
          const profileUpdate = { status: EmployeeProfileStatus.DRAFTED };
          return this.storeAuditHistory(npn, receiverNpn, profileUpdate);
        }),
      );

      return {
        message: 'Profiles enabled successfully!',
        count: profiles.modifiedCount,
      };
    } catch (error) {
      console.error('Error enabling profile:', error.message);
      throw new BadRequestException(error.message);
    }
  }

  async getPendingProfilesForUpline(
    receiverNpn: string,
    query: any,
  ): Promise<any> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = query.search?.trim() || '';
    const sortOrder: 1 | -1 = Number(query.sortOrder) === 1 ? 1 : -1;

    try {
      const npns = await this.employeeService.getAllDownlines(receiverNpn);

      const existingNpns: string[] = await this.employeeProfileModel.distinct(
        'npn',
        { npn: { $in: npns } },
      );

      // now build a Set for O(1) lookups…
      const existingSet = new Set(existingNpns);

      // …and filter your original list to only those not in existingSet:
      const newNpns = npns.filter((npn) => !existingSet.has(npn));

      const match: any = {
        npn: { $in: newNpns },
      };

      if (search) {
        match.$or = [
          { agent: { $regex: search, $options: 'i' } },
          { agentsUpline: { $regex: search, $options: 'i' } },
        ];
      }

      const result = await this.employeeModel.aggregate([
        { $match: match },
        { $sort: { agent: sortOrder } },
        {
          $facet: {
            data: [{ $skip: skip }, { $limit: limit }],
            total: [{ $count: 'count' }],
          },
        },
      ]);

      const data = result[0]?.data || [];
      const total = result[0]?.total[0]?.count || 0;

      return {
        profiles: data.map((profile) => {
          delete profile.__v;
          return profile;
        }),
        total,
        page,
        limit,
      };
    } catch (error) {
      console.error('Error fetching profile:', error.message);
      throw new BadRequestException('Something went wrong!');
    }
  }
}
