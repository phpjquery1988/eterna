// models/employee-profile.model.ts
import { Schema, model, Document, HydratedDocument } from 'mongoose';

// If '@app/contracts' is an internal project dependency for enums,
// you'll need to define these enums directly or ensure that `@app/contracts`
// is available in your Express.js project.
// For this example, I'll define them inline for completeness.

export enum EmployeeProfileStatus {
  Active = 'active',
  Inactive = 'inactive',
  Pending = 'pending',
}

export enum UserRoleEnum {
  Admin = 'admin',
  Employee = 'employee',
  Client = 'client',
}

// ----------------------------------------------------
// Sub-document: License
// ----------------------------------------------------
export interface License {
  name: string;
  postal: string;
  imageUrl: string;
}

const LicenseSchema = new Schema<License>({
  name: { type: String, required: true },
  postal: { type: String, required: true },
  imageUrl: { type: String, required: true },
}, { _id: false }); // Matches @Schema({ id: false })

// ----------------------------------------------------
// Sub-document: Carrier
// ----------------------------------------------------
export interface Carrier extends Document { // Extend Document as in your original
  carrier?: string;
  slug: string;
  imageUrl?: string;
}

const CarrierSchema = new Schema<Carrier>({
  carrier: { type: String, required: false },
  slug: { type: String, required: true },
  imageUrl: { type: String, required: false },
}, { _id: false }); // Matches @Schema({ id: false })

// ----------------------------------------------------
// Main Document: EmployeeProfile
// ----------------------------------------------------
export interface EmployeeProfile extends Document {
  npn?: string;
  avatar?: string;
  phone?: string;
  email?: string;
  name?: string;
  upline?: string;
  uplineNpn?: string;
  quote?: string;
  isPublished?: boolean;
  isNewAvatar?: boolean;
  rating?: number;
  familyPhoto?: string;
  familyDescription?: string;
  address?: string;
  licenses?: License[];
  carriers?: Carrier[];
  status?: EmployeeProfileStatus; // Use the enum type
  quoteLink?: string;
  appointmentLink?: string;
  firstName?: string;
  lastName?: string;
  designation?: string;
  contactDetailDescription?: string;
  facebookLink?: string;
  instaLink?: string;
  linkedInLink?: string;
  insuranceTypes?: string[];
  serviceProvided?: { title?: string; description?: string }[];
  whyWorkWithServices?: { title?: string; description?: string }[];
  whyWorkWithDescription?: string;
  role: UserRoleEnum; // Use the enum type
}

const EmployeeProfileSchema = new Schema<EmployeeProfile>({
  npn: { type: String, required: false, unique: true },
  avatar: { type: String },
  phone: { type: String, required: false },
  email: { type: String, required: false },
  name: { type: String, required: false },
  upline: { type: String, required: false },
  uplineNpn: { type: String, required: false },
  quote: { type: String },
  isPublished: { type: Boolean },
  isNewAvatar: { type: Boolean },
  rating: { type: Number },
  familyPhoto: { type: String },
  familyDescription: { type: String },
  address: { type: String },
  licenses: { type: [LicenseSchema], default: [] },
  carriers: { type: [CarrierSchema], default: [] },
  status: { type: String, enum: Object.values(EmployeeProfileStatus) }, // Use Object.values for enum
  quoteLink: { type: String },
  appointmentLink: { type: String },
  firstName: { type: String },
  lastName: { type: String },
  designation: { type: String, default: '' },
  contactDetailDescription: { type: String, default: '' },
  facebookLink: { type: String },
  instaLink: { type: String },
  linkedInLink: { type: String },
  insuranceTypes: { type: [String], default: [] },
  serviceProvided: {
    type: [
      {
        title: { type: String, required: false },
        description: { type: String, required: false },
      },
    ],
    default: [
      {
        title: 'Instant Coverage',
        description:
          'Get coverage up to $2M without a medical exam-just answer few easy health questions.',
      },
      {
        title: 'Broad Age Coverage',
        description:
          'We can offer a coverage to over 90% of applicants aged 20-85, on average.',
      },
      {
        title: 'Tailored Options',
        description:
          'Flexible coverage plans to suit various budgets and needs.',
      },
      {
        title: 'Personalized Support',
        description: 'Our team is here to offer dedicated assistance.',
      },
    ],
  },
  whyWorkWithServices: {
    type: [
      {
        title: { type: String, required: false },
        description: { type: String, required: false },
      },
    ],
    default: [
      {
        title: 'Great Service!',
        description:
          "{{name}} is hands down the best insurance agent I've ever worked with. He took the time to walk me through every detail of my policy. Highly recommend! - Jessica Thompson",
      },
      {
        title: 'Highly Recommended!',
        description:
          '{{name}} was great to work with — very knowledgeable and responsive. He helped me switch auto and home insurance and saved me a good chunk of money. — Brian Matthews',
      },
      {
        title: 'Stress-Free Service',
        description:
          '{{name}} made the entire insurance process smooth and stress-free. He’s not just an agent—he’s someone you can actually rely on.',
      },
      {
        title: 'Greate Service',
        description:
          '{{name}} was great to work with — very knowledgeable and responsive. He helped me switch auto and home insurance and saved me a good chunk of money. — Brian Matthews',
      },
      {
        title: 'Thank you!',
        description:
          '{{name}} is hands down the best insurance agent I’ve ever worked with. He took the time to walk me through every detail of my policy. Highly Recommend! — Jessica Thompson',
      },
    ],
  },
  whyWorkWithDescription: { type: String, default: '' },
  role: {
    type: String,
    required: true,
    enum: Object.values(UserRoleEnum), // Use Object.values for enum
    default: UserRoleEnum.Employee,
  },
}, { timestamps: true });

const EmployeeProfileModel = model<EmployeeProfile>('EmployeeProfile', EmployeeProfileSchema);

export default EmployeeProfileModel;